import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const PIPELINE_URL    = process.env.PIPELINE_URL ?? 'http://77.42.95.127:5003/s9-pipeline';
const COLLECTOR_URL   = process.env.S9_COLLECTOR_URL ?? 'http://77.42.95.127:5003/s9-collector';
const TMDB_API_KEY    = process.env.NEXT_PUBLIC_TMDB_API_KEY ?? '02269a98332ab91c6579fa12ef995e5a';
const TMDB_SERIES_ID  = '60625';
const STATE_KEY       = 'meta/s9-processed.json';

// ── R2 client ────────────────────────────────────────────────────────────────

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
}

// ── Processed-episode state (R2) ──────────────────────────────────────────────

async function getProcessedEpisodes(): Promise<Set<number>> {
  try {
    const r2 = getR2Client();
    const res = await r2.send(new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: STATE_KEY,
    }));
    const body = await res.Body!.transformToString();
    const data: number[] = JSON.parse(body);
    return new Set(data);
  } catch {
    return new Set();
  }
}

async function markEpisodesProcessed(episodes: number[]): Promise<void> {
  const existing = await getProcessedEpisodes();
  episodes.forEach(e => existing.add(e));
  const r2 = getR2Client();
  await r2.send(new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: STATE_KEY,
    Body: JSON.stringify([...existing]),
    ContentType: 'application/json',
  }));
}

// ── Collector client ─────────────────────────────────────────────────────────

type EpisodeCandidate = {
  title: string;
  season: number;
  episode: number;
  episodeId: number;
  magnetLink: string | null;
  fileSize: string;
  quality: string;
  source: string;
};

type CollectorSourceResult = {
  source: string;
  found: number;
  error: string | null;
  meta?: Record<string, unknown>;
};

type CollectorResponse = {
  found: boolean;
  sources: CollectorSourceResult[];
  candidates: EpisodeCandidate[];
  checked: string;
};

async function fetchCollector(secret: string): Promise<CollectorResponse> {
  const res = await fetch(COLLECTOR_URL, {
    headers: {
      'Authorization': `Bearer ${secret}`,
      'Content-Type': 'application/json'
    },
    signal: AbortSignal.timeout(15000)
  });

  if (!res.ok) {
    throw new Error(`Collector HTTP ${res.status}`);
  }

  return res.json();
}

// ── TMDB validation ───────────────────────────────────────────────────────────

async function verifyEpisodeAired(episodeNum: number): Promise<{ name: string; airDate: string } | null> {
  try {
    const url = `https://api.themoviedb.org/3/tv/${TMDB_SERIES_ID}/season/9/episode/${episodeNum}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.log(`TMDB: S09E${String(episodeNum).padStart(2, '0')} not found (${res.status})`);
      return null;
    }

    const data = await res.json();
    const airDate = data.air_date as string | null;
    const name = (data.name as string) || `Episode ${episodeNum}`;

    if (!airDate) {
      console.log(`TMDB: S09E${String(episodeNum).padStart(2, '0')} has no air date yet`);
      return null;
    }

    const aired = new Date(airDate);
    const now = new Date();

    if (aired > now) {
      console.log(`TMDB: S09E${String(episodeNum).padStart(2, '0')} airs ${airDate} — not yet aired`);
      return null;
    }

    console.log(`TMDB: S09E${String(episodeNum).padStart(2, '0')} "${name}" aired ${airDate} ✅`);
    return { name, airDate };
  } catch (e: any) {
    console.error(`TMDB check failed for S09E${episodeNum}: ${e.message}`);
    return null;
  }
}

// ── Pipeline trigger ──────────────────────────────────────────────────────────

async function triggerPipeline(episodes: EpisodeCandidate[], secret: string) {
  try {
    const res = await fetch(PIPELINE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ episodes }),
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();
    console.log('Pipeline triggered:', JSON.stringify(data));
    return data;
  } catch (e: any) {
    console.error('Pipeline trigger failed:', e.message);
    return { error: e.message };
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET ?? '';
  if (authHeader !== `Bearer ${secret}`) {
    const url = new URL(request.url);
    if (!url.searchParams.has('test')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('Checking for Rick and Morty Season 9...');

  let collector: CollectorResponse;
  try {
    collector = await fetchCollector(secret);
  } catch (error: any) {
    return NextResponse.json({
      found: false,
      error: `Collector failed: ${error.message}`,
      checked: new Date().toISOString()
    });
  }

  const candidates = collector.candidates ?? [];
  if (candidates.length === 0) {
    return NextResponse.json({
      found: false,
      checked: collector.checked ?? new Date().toISOString(),
      sources: collector.sources ?? []
    });
  }

  console.log(`Found ${candidates.length} S9 candidate(s) from collector`);

  const processed = await getProcessedEpisodes();
  const unprocessed = candidates.filter(ep => !processed.has(ep.episode));

  if (unprocessed.length === 0) {
    console.log('All found episodes already processed — nothing to do');
    return NextResponse.json({
      found: true,
      sources: collector.sources ?? [],
      alreadyProcessed: candidates.map(e => ({ episode: e.episode, source: e.source, quality: e.quality })),
      message: 'All episodes already sent to pipeline',
      checked: collector.checked ?? new Date().toISOString()
    });
  }

  console.log(`${unprocessed.length} new episode(s) to process, verifying against TMDB...`);

  const verified: Array<EpisodeCandidate & { tmdbName: string; tmdbAirDate: string }> = [];
  const skipped: EpisodeCandidate[] = [];

  for (const ep of unprocessed) {
    const tmdb = await verifyEpisodeAired(ep.episode);
    if (tmdb) {
      verified.push({ ...ep, tmdbName: tmdb.name, tmdbAirDate: tmdb.airDate });
    } else {
      console.log(`S09E${ep.episode} failed TMDB check — skipping`);
      skipped.push(ep);
    }
  }

  console.log(`Verified: ${verified.length}, Skipped: ${skipped.length}`);

  if (verified.length === 0) {
    return NextResponse.json({
      found: false,
      sources: collector.sources ?? [],
      candidates: candidates.length,
      skipped,
      message: 'All found torrents are pre-air or unverified',
      checked: collector.checked ?? new Date().toISOString()
    });
  }

  const pipelineResult = await triggerPipeline(verified, secret);
  await markEpisodesProcessed(verified.map(e => e.episode));

  return NextResponse.json({
    found: true,
    sources: collector.sources ?? [],
    verified: verified.map(e => ({ episode: e.episode, quality: e.quality, name: e.tmdbName, airDate: e.tmdbAirDate, source: e.source })),
    skipped,
    pipeline: pipelineResult,
    checked: collector.checked ?? new Date().toISOString()
  });
}
