// This file maps episode IDs to video URLs.
// Using raw R2 MP4 links as the primary source now that PeerTube is gone.

export const videoSources: Record<string, string> = {};

// Cache-bust map: bump version when a video is re-encoded
const cacheBust: Record<string, number> = {
  '52': 1, // S06E01 replaced 2026-03-24
  '61': 3, // S06E10 replaced 2026-03-23
  '81': 1, // S07E10 (Hot Rick) audio fix stereo 2026-03-26
};

export function getVideoUrl(id: string) {
  // Direct raw R2 MP4
  const v = cacheBust[id] ? `?v=${cacheBust[id]}` : '';
  return `https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev/videos/episode-${id}.mp4${v}`;
}
