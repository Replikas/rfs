import { NextResponse } from 'next/server';

const EZTV_DOMAINS = [
  'eztv1.xyz',
  'eztv.re',
  'eztv.tf',
  'eztv.yt',
  'eztvx.to'
];

const PIPELINE_URL   = 'http://77.42.95.127:5003/s9-pipeline';
const TMDB_API_KEY   = process.env.NEXT_PUBLIC_TMDB_API_KEY ?? '02269a98332ab91c6579fa12ef995e5a';
const TMDB_SERIES_ID = '60625';

async function checkDomain(domain: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://${domain}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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

function parseForSeason9(html: string) {
  const episodes: any[] = [];
  const rowRegex = /<tr[^>]*class="forum_header_border"[^>]*>([\s\S]*?)<\/tr>/g;
  const rows = [...html.matchAll(rowRegex)];

  for (const row of rows) {
    const rowHtml = row[1];
    const titleMatch = rowHtml.match(/class="epinfo"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;

    const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
    if (!title.toLowerCase().includes('rick') || !title.toLowerCase().includes('morty')) continue;

    const episodeMatch = title.match(/[Ss]09[Ee](\d{2})/);
    if (!episodeMatch) continue;

    const episode = parseInt(episodeMatch[1]);
    const magnetMatch = rowHtml.match(/href="(magnet:[^"]+)"/);
    const sizeMatch = rowHtml.match(/<td[^>]*class="forum_thread_post"[^>]*>\s*([\d.]+\s*[MGT]B)/i);

    let quality = 'Unknown';
    if (title.includes('2160p') || title.includes('4K')) quality = '2160p';
    else if (title.includes('1080p')) quality = '1080p';
    else if (title.includes('720p')) quality = '720p';

    episodes.push({
      title,
      season: 9,
      episode,
      episodeId: 80 + episode,
      magnetLink: magnetMatch ? magnetMatch[1] : null,
      fileSize: sizeMatch ? sizeMatch[1] : 'Unknown',
      quality
    });
  }
  return episodes;
}

function getBestVersions(episodes: any[]) {
  const episodeMap = new Map();
  const qualityOrder: Record<string, number> = { '2160p': 3, '1080p': 2, '720p': 1, 'Unknown': 0 };

  for (const ep of episodes) {
    const existing = episodeMap.get(ep.episode);
    if (!existing || (qualityOrder[ep.quality] || 0) > (qualityOrder[existing.quality] || 0)) {
      episodeMap.set(ep.episode, ep);
    }
  }
  return Array.from(episodeMap.values()).sort((a, b) => a.episode - b.episode);
}

/**
 * Verify episode against TMDB:
 * - Episode must exist on TMDB for S9
 * - Air date must be in the past (already aired on Adult Swim)
 * - Returns null if episode fails validation (pre-air, fake, wrong ep number)
 */
async function verifyEpisodeAired(episodeNum: number): Promise<{ name: string; airDate: string } | null> {
  try {
    const url = `https://api.themoviedb.org/3/tv/${TMDB_SERIES_ID}/season/9/episode/${episodeNum}?api_key=${TMDB_API_KEY}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) {
      console.log(`TMDB: S09E${String(episodeNum).padStart(2,'0')} not found (${res.status}) — skipping`);
      return null;
    }

    const data = await res.json();
    const airDate = data.air_date as string | null;
    const name = (data.name as string) || `Episode ${episodeNum}`;

    if (!airDate) {
      console.log(`TMDB: S09E${String(episodeNum).padStart(2,'0')} has no air date yet — skipping`);
      return null;
    }

    const aired = new Date(airDate);
    const now = new Date();

    if (aired > now) {
      console.log(`TMDB: S09E${String(episodeNum).padStart(2,'0')} airs ${airDate} — not yet aired, skipping`);
      return null;
    }

    console.log(`TMDB: S09E${String(episodeNum).padStart(2,'0')} "${name}" aired ${airDate} ✅`);
    return { name, airDate };
  } catch (e: any) {
    console.error(`TMDB check failed for S09E${episodeNum}: ${e.message}`);
    return null;
  }
}

async function triggerPipeline(episodes: any[], secret: string) {
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

  const domain = await findActiveDomain();
  if (!domain) {
    return NextResponse.json({ found: false, error: 'No active EZTV domain', checked: new Date().toISOString() });
  }

  try {
    const res = await fetch(`https://${domain}/search/rick-and-morty`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await res.text();
    const season9Episodes = parseForSeason9(html);

    if (season9Episodes.length === 0) {
      console.log('Season 9 not yet on EZTV');
      return NextResponse.json({ found: false, domain, checked: new Date().toISOString() });
    }

    const candidates = getBestVersions(season9Episodes);
    console.log(`Found ${candidates.length} S9 candidate(s) on EZTV — verifying against TMDB...`);

    // Validate each episode against TMDB — only pass through episodes that have actually aired
    const verified: any[] = [];
    const skipped: any[] = [];

    for (const ep of candidates) {
      const tmdb = await verifyEpisodeAired(ep.episode);
      if (tmdb) {
        verified.push({ ...ep, tmdbName: tmdb.name, tmdbAirDate: tmdb.airDate });
      } else {
        skipped.push({ episode: ep.episode, reason: 'not yet aired or not on TMDB' });
      }
    }

    console.log(`Verified: ${verified.length}, Skipped (pre-air/fake): ${skipped.length}`);

    if (verified.length === 0) {
      return NextResponse.json({
        found: false,
        domain,
        candidates: candidates.length,
        skipped,
        message: 'All found torrents are pre-air or unverified — not downloading',
        checked: new Date().toISOString()
      });
    }

    const pipelineResult = await triggerPipeline(verified, secret);

    return NextResponse.json({
      found: true,
      domain,
      verified: verified.map(e => ({ episode: e.episode, quality: e.quality, name: e.tmdbName, airDate: e.tmdbAirDate })),
      skipped,
      pipeline: pipelineResult,
      checked: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Check failed:', error.message);
    return NextResponse.json({ found: false, error: error.message, checked: new Date().toISOString() });
  }
}
