import { additionalEpisodes } from './additionalEpisodes';
import peertubeMappings from './peertube_mappings.json';

export interface Episode {
  id: number;
  name: string;
  air_date: string;
  episode: string; // e.g., "S01E01"
  characters: string[];
  url: string;
  created: string;
}

interface ApiResponse {
  info: {
    count: number;
    pages: number;
    next: string | null;
    prev: string | null;
  };
  results: Episode[];
}

export async function getAllEpisodes(): Promise<Episode[]> {
  let allEpisodes: Episode[] = [];
  let nextUrl: string | null = 'https://rickandmortyapi.com/api/episode';

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data: ApiResponse = await res.json();
    allEpisodes = [...allEpisodes, ...data.results];
    nextUrl = data.info.next;
  }

  // Fetch dynamically snatched episodes from C-137 HQ
  let dynamicEpisodes: Episode[] = [];
  try {
    const res = await fetch('https://gained-ranch-dogs-unity.trycloudflare.com/api/episodes.json', { cache: 'no-store' });
    if (res.ok) {
      dynamicEpisodes = await res.json();
    }
  } catch (e) {
    console.error('Failed to fetch dynamic episodes from C-137 HQ');
  }

  // Merge and deduplicate by ID
  const combined = [...allEpisodes, ...additionalEpisodes, ...dynamicEpisodes];
  const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
  
  return unique;
}

export function groupEpisodesBySeason(episodes: Episode[]) {
  return episodes.reduce((acc, episode) => {
    const season = episode.episode.substring(0, 3); // "S01"
    if (!acc[season]) {
      acc[season] = [];
    }
    acc[season].push(episode);
    return acc;
  }, {} as Record<string, Episode[]>);
}

export async function getEpisodeById(id: string): Promise<Episode> {
  // Check if it's in additional episodes first (seasons 6-8)
  const additionalEpisode = additionalEpisodes.find(ep => ep.id === parseInt(id));
  if (additionalEpisode) {
    return additionalEpisode;
  }

  // Check dynamic episodes from C-137 HQ
  try {
    const res = await fetch('https://gained-ranch-dogs-unity.trycloudflare.com/api/episodes.json', { cache: 'no-store' });
    if (res.ok) {
      const dynamicEpisodes: Episode[] = await res.json();
      const dynamicEp = dynamicEpisodes.find(ep => ep.id === parseInt(id));
      if (dynamicEp) return dynamicEp;
    }
  } catch (e) {}
  
  // Otherwise fetch from API (seasons 1-5)
  const res = await fetch(`https://rickandmortyapi.com/api/episode/${id}`);
  return res.json();
}
