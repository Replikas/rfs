import { NextResponse } from 'next/server';

// EZTV domains to try
const EZTV_DOMAINS = [
  'eztv1.xyz',
  'eztv.re',
  'eztv.tf',
  'eztv.yt',
  'eztvx.to'
];

// Check if domain is accessible
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

// Find active EZTV domain
async function findActiveDomain(): Promise<string | null> {
  for (const domain of EZTV_DOMAINS) {
    if (await checkDomain(domain)) {
      return domain;
    }
  }
  return null;
}

// Parse EZTV search results for Season 9
function parseForSeason9(html: string) {
  const episodes: any[] = [];
  const rowRegex = new RegExp('<tr[^>]*class="forum_header_border"[^>]*>(.*?)</tr>', 'gs');
  const rows = [...html.matchAll(rowRegex)];

  for (const row of rows) {
    const rowHtml = row[1];
    const titleMatch = rowHtml.match(new RegExp('class="epinfo"[^>]*>(.*?)</a>', 's'));
    if (!titleMatch) continue;
    
    const title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
    if (!title.toLowerCase().includes('rick') || !title.toLowerCase().includes('morty')) continue;

    const episodeMatch = title.match(/[Ss]09[Ee](\d{2})/);
    if (!episodeMatch) continue;

    const episode = parseInt(episodeMatch[1]);
    const magnetMatch = rowHtml.match(/href="(magnet:\?[^"]+)"/);
    const sizeMatch = rowHtml.match(/<td[^>]*class="forum_thread_post"[^>]*>\s*([\d.]+\s*[MGT]B)/i);

    let quality = 'Unknown';
    if (title.includes('1080p')) quality = '1080p';
    else if (title.includes('720p')) quality = '720p';
    else if (title.includes('2160p') || title.includes('4K')) quality = '2160p';

    episodes.push({
      title,
      season: 9,
      episode,
      episodeId: 81 + episode,
      magnetLink: magnetMatch ? magnetMatch[1] : null,
      fileSize: sizeMatch ? sizeMatch[1] : 'Unknown',
      quality
    });
  }

  return episodes;
}

// Get best version of each episode
function getBestVersions(episodes: any[]) {
  const episodeMap = new Map();
  
  for (const ep of episodes) {
    const key = ep.episode;
    if (!episodeMap.has(key)) {
      episodeMap.set(key, ep);
    } else {
      const existing = episodeMap.get(key);
      const qualityOrder: Record<string, number> = { '2160p': 3, '1080p': 2, '720p': 1, 'Unknown': 0 };
      if ((qualityOrder[ep.quality] || 0) > (qualityOrder[existing.quality] || 0)) {
        episodeMap.set(key, ep);
      }
    }
  }
  
  return Array.from(episodeMap.values()).sort((a, b) => a.episode - b.episode);
}

// Send notification via Discord webhook
async function sendNotification(episodes: any[], domain: string) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.log('No Discord webhook configured, skipping notification');
    return;
  }

  try {
    const episodeList = episodes.map(ep => 
      `• **S09E${String(ep.episode).padStart(2, '0')}** - ${ep.quality} - ${ep.fileSize}`
    ).join('\n');

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '🎉 **Rick and Morty Season 9 Found!**',
        embeds: [{
          title: 'New Episodes Detected on EZTV',
          description: episodeList,
          color: 0x00ff00,
          fields: [
            {
              name: 'Download Link',
              value: `[EZTV Search](https://${domain}/search/rick-and-morty)`
            }
          ],
          footer: {
            text: 'RickFlix Auto Monitor'
          },
          timestamp: new Date().toISOString()
        }]
      })
    });
    
    console.log('Discord notification sent');
  } catch (e) {
    console.log('Could not send Discord notification:', e);
  }
}

export async function GET(request: Request) {
  // Verify cron secret (Vercel sends this header)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow manual checks without auth for testing
    const url = new URL(request.url);
    if (!url.searchParams.has('test')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  console.log('='.repeat(50));
  console.log('Checking for Rick and Morty Season 9...');
  
  const domain = await findActiveDomain();
  
  if (!domain) {
    console.log('No active EZTV domain found');
    return NextResponse.json({ 
      found: false, 
      error: 'No active EZTV domain',
      checked: new Date().toISOString()
    });
  }

  try {
    const searchUrl = `https://${domain}/search/rick-and-morty`;
    console.log(`Searching: ${searchUrl}`);
    
    const res = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    
    const html = await res.text();
    const season9Episodes = parseForSeason9(html);
    
    if (season9Episodes.length === 0) {
      console.log('Season 9 not yet available');
      return NextResponse.json({ 
        found: false,
        domain,
        checked: new Date().toISOString()
      });
    }

    const bestVersions = getBestVersions(season9Episodes);
    
    console.log(`🎉 SEASON 9 FOUND! ${bestVersions.length} episode(s)`);
    
    // Send notification
    await sendNotification(bestVersions, domain);

    return NextResponse.json({ 
      found: true,
      domain,
      episodes: bestVersions,
      checked: new Date().toISOString()
    });

  } catch (error: any) {
    console.log(`Check failed: ${error.message}`);
    return NextResponse.json({ 
      found: false, 
      error: error.message,
      checked: new Date().toISOString()
    });
  }
}
