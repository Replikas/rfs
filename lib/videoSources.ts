// This file maps episode IDs to video URLs.
// You can host videos in the 'public/videos' folder and reference them here,
// or use external URLs.

export const videoSources: Record<string, string> = {
  // Example:
  // "1": "/videos/rick-and-morty-s01e01.mp4",
};

export function getVideoUrl(id: string) {
  return videoSources[id] || "";
}
