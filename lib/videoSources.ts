import peertubeMappings from './peertube_mappings.json';

// This file maps episode IDs to video URLs.
// You can host videos in the 'public/videos' folder and reference them here,
// or use external URLs.

export const videoSources: Record<string, string> = {
  ...peertubeMappings,
};

export function getVideoUrl(id: string) {
  // If we have a PeerTube HLS URL, use it
  if (videoSources[id]) {
    return videoSources[id];
  }
  
  // Fallback to raw R2 MP4
  return `https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev/videos/episode-${id}.mp4`;
}
