// TMDB API for episode thumbnails
// Get your free API key at: https://www.themoviedb.org/settings/api

const TMDB_API_KEY = '02269a98332ab91c6579fa12ef995e5a';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const RICK_AND_MORTY_TMDB_ID = '60625'; // Rick and Morty series ID on TMDB

interface TMDBEpisode {
  still_path: string | null;
  name: string;
  season_number: number;
  episode_number: number;
  overview: string;
}

// Cache for episode images
const episodeImageCache: Record<string, string> = {};

export async function getEpisodeThumbnail(season: number, episode: number): Promise<string> {
  const cacheKey = `s${season}e${episode}`;
  
  // Return from cache if available
  if (episodeImageCache[cacheKey]) {
    return episodeImageCache[cacheKey];
  }

  // If no API key, return placeholder
  if (!TMDB_API_KEY) {
    return '/placeholder-thumbnail.jpg';
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${RICK_AND_MORTY_TMDB_ID}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) {
      if (season === 9) return '/s9-placeholder.png';
      return '/placeholder-thumbnail.jpg';
    }

    const data: TMDBEpisode = await response.json();
    
    if (data.still_path) {
      const imageUrl = `${TMDB_IMAGE_BASE}${data.still_path}`;
      episodeImageCache[cacheKey] = imageUrl;
      return imageUrl;
    }
  } catch (error) {
    console.error('Error fetching TMDB thumbnail:', error);
  }

  if (season === 9) return '/s9-placeholder.png';
  return '/placeholder-thumbnail.jpg';
}

// Parse episode code (e.g., "S01E01") and get thumbnail
export async function getThumbnailFromEpisodeCode(episodeCode: string): Promise<string> {
  const match = episodeCode.match(/S(\d+)E(\d+)/i);
  if (!match) return '/placeholder-thumbnail.jpg';
  
  const season = parseInt(match[1]);
  const episode = parseInt(match[2]);
  
  return getEpisodeThumbnail(season, episode);
}

// Get high-res backdrop for episode (for watch page)
export async function getEpisodeBackdrop(episodeCode: string): Promise<string> {
  const match = episodeCode.match(/S(\d+)E(\d+)/i);
  if (!match || !TMDB_API_KEY) {
    return 'https://images4.alphacoders.com/131/1313607.png'; // Default Rick and Morty backdrop
  }
  
  const season = parseInt(match[1]);
  const episode = parseInt(match[2]);

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${RICK_AND_MORTY_TMDB_ID}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) {
      if (season === 9) return '/s9-placeholder.png';
      return 'https://images4.alphacoders.com/131/1313607.png';
    }

    const data: TMDBEpisode = await response.json();
    
    if (data.still_path) {
      // Use original size for backdrop
      return `https://image.tmdb.org/t/p/original${data.still_path}`;
    }
  } catch (error) {
    console.error('Error fetching TMDB backdrop:', error);
  }

  if (season === 9) return '/s9-placeholder.png';
  return 'https://images4.alphacoders.com/131/1313607.png';
}

// Get episode summary/overview from TMDB
export async function getEpisodeSummary(episodeCode: string): Promise<string> {
  const match = episodeCode.match(/S(\d+)E(\d+)/i);
  if (!match || !TMDB_API_KEY) {
    return '';
  }
  
  const season = parseInt(match[1]);
  const episode = parseInt(match[2]);

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/tv/${RICK_AND_MORTY_TMDB_ID}/season/${season}/episode/${episode}?api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) {
      return '';
    }

    const data: TMDBEpisode = await response.json();
    return data.overview || '';
  } catch (error) {
    console.error('Error fetching TMDB summary:', error);
    return '';
  }
}
