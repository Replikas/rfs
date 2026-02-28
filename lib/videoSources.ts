// This file maps episode IDs to video URLs.
// Using raw R2 MP4 links as the primary source now that PeerTube is gone.

export const videoSources: Record<string, string> = {};

export function getVideoUrl(id: string) {
  // Direct raw R2 MP4
  return `https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev/videos/episode-${id}.mp4`;
}
