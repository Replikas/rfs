import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const EZTV_DOMAINS = [
  'eztv1.xyz',
  'eztv.re',
  'eztv.tf',
  'eztv.yt',
  'eztvx.to'
];

const SEARCH_SOURCES = [
  {
    name: 'eztv',
    type: 'html' as const,
    getUrl: async () => {
      const domain = await findActiveDomain();
      return domain ? `https://${domain}/search/rick-and-morty` : null;
    },
    parse: parseEztvSeason9,
  },
  {
    name: 'torrentgalaxy',
    type: 'json' as const,
    getUrl: async () => 'https://torrentgalaxy.to/torrents.php?search=rick+and+morty',
    parse: parseGenericSeason9,
  },
  {
    name: '1337x',
    type: 'html' as const,
    getUrl: async () => 'https://www.1337x.to/search/rick%20and%20morty/1/',
    parse: parseGenericSeason9,
  }
];

const PIPELINE_URL   = process.env.PIPELINE_URL ?? 'http://77.42.95.127:5003/s9-pipeline';
const TMDB_API_KEY   = process.env.NEXT_PUBLIC_TMDB_API_KEY ?? '02269a98332ab91c6579fa12ef995e5a';
const TMDB_SERIES_ID = '60625';
const STATE_KEY      = 'meta/s9-processed.json';
const USER_AGENT     = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const QUALITY_ORDER: Record<string, number> = { '2160p': 3, '1080p': 2, '720p': 1, 'Unknown': 0 };

// ── R2 client ────────────────────────────────────────────────────────────────

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
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

// ── Discovery helpers ────────────────────────────────────────────────────────

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

async function checkDomain(domain: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://${domain}`, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT }
    });
    clearTimeout(timeout);
    return res.ok || res.status === 301 || res.status === 302;
  } catch {
    return false;
  }
}

async function findActiveDomain(): Promise<string | null> {
  for (const domain of EZTV_DOMAINS) {
    if (await checkDomain(domain)) return domain;
  }
  return null;
}

function detectQuality(title: string) {
  const lower = title.toLowerCase();
  if (lower.includes('2160p') || lower.includes('4k')) return '2160p';
  if (lower.includes('1080p')) return '1080p';
  if (lower.includes('720p')) return '720p';
  return 'Unknown';
}

function buildCandidate(title: string, magnetLink: string | null, fileSize: string, source: string): EpisodeCandidate | null {
  const normalizedTitle = title.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const lower = normalizedTitle.toLowerCase();

  if (!lower.includes('rick') || !lower.includes('morty')) return null;

  const episodeMatch = normalizedTitle.match(/[Ss]09[Ee](\d{2})/);
  if (!episodeMatch) return null;

  const episode = parseInt(episodeMatch[1]);

  return {
    title: normalizedTitle,
    season: 9,
    episode,
    episodeId: 80 + episode,
    magnetLink,
    fileSize,
    quality: detectQuality(normalizedTitle),
    source,
  };
}

function parseEztvSeason9(html: string, source: string) {
  const episodes: EpisodeCandidate[] = [];
  const rowRegex = /<tr[^>]*class="forum_header_border"[^>]*>([\s\S]*?)<\/tr>/g;
  const rows = [...html.matchAll(rowRegex)];

  for (const row of rows) {
    const rowHtml = row[1];
    const titleMatch = rowHtml.match(/class="epinfo"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;

    const magnetMatch = rowHtml.match(/href="(magnet:[^"]+)"/);
    const sizeMatch = rowHtml.match(/<td[^>]*class="forum_thread_post"[^>]*>\s*([\d.]+\s*[MGT]B)/i);
    const candidate = buildCandidate(titleMatch[1], magnetMatch ? magnetMatch[1] : null, sizeMatch ? sizeMatch[1] : 'Unknown', source);
    if (candidate) episodes.push(candidate);
  }

  return episodes;
}

function parseGenericSeason9(html: string, source: string) {
  const episodes: EpisodeCandidate[] = [];
  const magnetRegex = /(magnet:\?xt=urn:[^"'\s<>]+)/gi;
  const seen = new Set<string>();

  for (const match of html.matchAll(magnetRegex)) {
    const magnet = match[1];
    if (seen.has(magnet)) continue;
    seen.add(magnet);

    const start = Math.max(0, match.index! - 500);
    const end = Math.min(html.length, match.index! + 500);
    const context = html.slice(start, end).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const candidate = buildCandidate(context, magnet, 'Unknown', source);
    if (candidate) episodes.push(candidate);
  }

  return episodes;
}

async function fetchSourceEpisodes(source: typeof SEARCH_SOURCES[number]) {
  try {
    const url = await source.getUrl();
    if (!url) {
      return { source: source.name, episodes: [] as EpisodeCandidate[], error: 'Source unavailable' };
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      return { source: source.name, episodes: [] as EpisodeCandidate[], error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const episodes = source.parse(html, source.name);
    return { source: source.name, episodes };
  } catch (e: any) {
    return { source: source.name, episodes: [] as EpisodeCandidate[], error: e.message };
  }
}

function getBestVersions(episodes: EpisodeCandidate[]) {
  const episodeMap = new Map<number, EpisodeCandidate>();

  for (const ep of episodes) {
    const existing = episodeMap.get(ep.episode);
    if (!existing) {
      episodeMap.set(ep.episode, ep);
      continue;
    }

    const existingQuality = QUALITY_ORDER[existing.quality] || 0;
    const currentQuality = QUALITY_ORDER[ep.quality] || 0;

    if (currentQuality > existingQuality) {
      episodeMap.set(ep.episode, ep);
      continue;
    }

    if (currentQuality === existingQuality && !existing.magnetLink && ep.magnetLink) {
      episodeMap.set(ep.episode, ep);
    }
  }

  return Array.from(episodeMap.values()).sort((a, b) => a.episode - b.episode);
}

// ── TMDB validation ───────────────────────────────────────────────────────────

async function verifyEpisodeAired(episodeNum: number): Promise<{ name: string; airDate: string } | null> {
  try {
    const url = `https://api.themoviedb.org/3/tv/${TMDB_SERIES_ID}/season/9/episode/${episodeNum}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.log(`TMDB: S09E${String(episodeNum).padStart(2,'0')} not found (${res.status})`);
      return null;
    }

    const data = await res.json();
    const airDate = data.air_date as string | null;
    const name = (data.name as string) || `Episode ${episodeNum}`;

    if (!airDate) {
      console.log(`TMDB: S09E${String(episodeNum).padStart(2,'0')} has no air date yet`);
      return null;
    }

    const aired = new Date(airDate);
    const now = new Date();

    if (aired > now) {
      console.log(`TMDB: S09E${String(episodeNum).padStart(2,'0')} airs ${airDate} — not yet aired`);
      return null;
    }

    console.log(`TMDB: S09E${String(episodeNum).padStart(2,'0')} "${name}" aired ${airDate} ✅`);
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

  const sourceResults = await Promise.all(SEARCH_SOURCES.map(fetchSourceEpisodes));
  const availableSources = sourceResults.filter(result => result.episodes.length > 0);
  const allEpisodes = sourceResults.flatMap(result => result.episodes);

  if (allEpisodes.length === 0) {
    return NextResponse.json({
      found: false,
      checked: new Date().toISOString(),
      sources: sourceResults.map(result => ({ source: result.source, found: result.episodes.length, error: result.error ?? null }))
    });
  }

  const candidates = getBestVersions(allEpisodes);
  console.log(`Found ${candidates.length} S9 candidate(s) across ${availableSources.length} source(s)`);

  const processed = await getProcessedEpisodes();
  const unprocessed = candidates.filter(ep => !processed.has(ep.episode));

  if (unprocessed.length === 0) {
    console.log('All found episodes already processed — nothing to do');
    return NextResponse.json({
      found: true,
      sources: sourceResults.map(result => ({ source: result.source, found: result.episodes.length, error: result.error ?? null })),
      alreadyProcessed: candidates.map(e => ({ episode: e.episode, source: e.source, quality: e.quality })),
      message: 'All episodes already sent to pipeline',
      checked: new Date().toISOString()
    });
  }

  console.log(`${unprocessed.length} new episode(s) to process, verifying against TMDB...`);

  const verified: any[] = [];
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
      sources: sourceResults.map(result => ({ source: result.source, found: result.episodes.length, error: result.error ?? null })),
      candidates: candidates.length,
      skipped,
      message: 'All found torrents are pre-air or unverified',
      checked: new Date().toISOString()
    });
  }

  const pipelineResult = await triggerPipeline(verified, secret);
  await markEpisodesProcessed(verified.map(e => e.episode));

  return NextResponse.json({
    found: true,
    sources: sourceResults.map(result => ({ source: result.source, found: result.episodes.length, error: result.error ?? null })),
    verified: verified.map(e => ({ episode: e.episode, quality: e.quality, name: e.tmdbName, airDate: e.tmdbAirDate, source: e.source })),
    skipped,
    pipeline: pipelineResult,
    checked: new Date().toISOString()
  });
}
