import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

export interface GeneratedHeroAsset {
  episodeBase: string;
  clipUrl?: string;
  loopUrl?: string;
  posterUrl?: string;
}

function toPublicUrl(relativePath: string): string {
  return `/${relativePath.replace(/^public\//, '').replace(/\\/g, '/')}`;
}

export function getGeneratedHeroMedia(): Record<number, GeneratedHeroAsset> {
  const outputDir = join(process.cwd(), 'public', 'generated-clips');

  if (!existsSync(outputDir)) {
    return {};
  }

  const files = readdirSync(outputDir);
  const manifestFiles = files.filter(file => file.endsWith('.json'));
  const assets: Record<number, GeneratedHeroAsset> = {};

  for (const file of manifestFiles) {
    try {
      const raw = readFileSync(join(outputDir, file), 'utf8');
      const manifest = JSON.parse(raw) as {
        source?: string;
        outputs?: { mp4?: string; webp?: string; poster?: string };
      };

      const source = manifest.source ?? '';
      const match = source.match(/episode-(\d+)/i);
      if (!match) continue;

      const episodeId = parseInt(match[1], 10);
      if (Number.isNaN(episodeId)) continue;

      assets[episodeId] = {
        episodeBase: source,
        clipUrl: manifest.outputs?.mp4 ? toPublicUrl(manifest.outputs.mp4) : undefined,
        loopUrl: manifest.outputs?.webp ? toPublicUrl(manifest.outputs.webp) : undefined,
        posterUrl: manifest.outputs?.poster ? toPublicUrl(manifest.outputs.poster) : undefined,
      };
    } catch (error) {
      console.error(`Failed to parse generated hero manifest ${file}:`, error);
    }
  }

  return assets;
}
