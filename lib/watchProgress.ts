// Watch progress tracking using localStorage

export interface WatchProgress {
  episodeId: number;
  currentTime: number;
  duration: number;
  lastWatched: number; // timestamp
  completed: boolean;
}

const STORAGE_KEY = 'rickflix_watch_progress';

export function getWatchProgress(episodeId: number): WatchProgress | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const allProgress: Record<string, WatchProgress> = JSON.parse(stored);
    return allProgress[episodeId] || null;
  } catch {
    return null;
  }
}

export function saveWatchProgress(progress: WatchProgress): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const allProgress: Record<string, WatchProgress> = stored ? JSON.parse(stored) : {};
    
    allProgress[progress.episodeId] = progress;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allProgress));
  } catch (error) {
    console.error('Failed to save watch progress:', error);
  }
}

export function getAllWatchProgress(): Record<string, WatchProgress> {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function getProgressPercentage(progress: WatchProgress | null): number {
  if (!progress || !progress.duration) return 0;
  return Math.min(100, Math.max(0, (progress.currentTime / progress.duration) * 100));
}

export function getRecentlyWatched(limit: number = 10): WatchProgress[] {
  const allProgress = getAllWatchProgress();
  return Object.values(allProgress)
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, limit);
}
