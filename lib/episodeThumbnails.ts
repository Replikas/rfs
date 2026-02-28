// Episode thumbnail mappings
// You can add custom thumbnail URLs here, or they'll fall back to a default

export const episodeThumbnails: Record<string, string> = {
  // Add your custom thumbnails here like:
  // "1": "/thumbnails/s01e01.jpg",
  // "2": "/thumbnails/s01e02.jpg",
  // Or use external URLs:
  // "1": "https://your-cdn.com/thumbnails/s01e01.jpg",
};

export function getThumbnailUrl(episodeId: number): string {
  return episodeThumbnails[episodeId.toString()] || '/placeholder-thumbnail.jpg';
}
