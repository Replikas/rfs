'use client';

import { useState, useMemo } from 'react';
import { Episode, groupEpisodesBySeason } from '@/lib/api';
import SeasonSection from './SeasonSection';
import { Search, X, Play, Clock } from 'lucide-react';
import Link from 'next/link';
import { getRecentlyWatched } from '@/lib/watchProgress';

interface ClientHomeProps {
  initialEpisodes: Episode[];
  thumbnails: Record<number, string>;
  summaries: Record<number, string>;
}

export default function ClientHome({ initialEpisodes, thumbnails, summaries }: ClientHomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredEpisodes = useMemo(() => {
    if (!searchQuery.trim()) return initialEpisodes;
    const query = searchQuery.toLowerCase();
    return initialEpisodes.filter(
      ep => ep.name.toLowerCase().includes(query) || ep.episode.toLowerCase().includes(query)
    );
  }, [initialEpisodes, searchQuery]);

  const episodesBySeason = useMemo(() => groupEpisodesBySeason(filteredEpisodes), [filteredEpisodes]);
  const seasons = useMemo(() => Object.keys(episodesBySeason).sort(), [episodesBySeason]);

  const recentlyWatched = useMemo(() => {
    const history = getRecentlyWatched(5);
    return history.map(h => {
      const ep = initialEpisodes.find(e => e.id === h.episodeId);
      if (!ep) return null;
      return { ...ep, progress: h };
    }).filter(Boolean) as (Episode & { progress: any })[];
  }, [initialEpisodes]);

  return (
    <div className="pb-12 relative z-10">
      {/* Search Bar Container - ABSOLUTELY FIXED AT TOP FOR ALL SIZES */}
      <div className="relative mx-4 -mt-6 mb-8 md:fixed md:mx-0 md:mt-0 md:mb-0 md:top-24 md:right-16 z-[99999] md:w-auto">
        <div className="w-full md:max-w-sm relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-[var(--accent)] transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search for an episode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/95 backdrop-blur-3xl border border-white/30 rounded-full py-4 md:py-3 pl-12 pr-12 text-base md:text-sm text-white focus:outline-none focus:border-[var(--accent)] transition-all placeholder-gray-400 shadow-[0_0_80px_rgba(0,0,0,1)] ring-2 ring-white/5"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-4 flex items-center"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* Continue Watching (Only if no search) */}
      {!searchQuery && recentlyWatched.length > 0 && (
        <section className="mb-14">
          <div className="px-4 md:px-12 mb-6 flex items-center gap-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-[var(--accent)]" />
                Continue Watching
              </h2>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-[var(--accent)]/30 to-transparent"></div>
          </div>
          <div className="px-4 md:px-12 overflow-x-auto scrollbar-hide py-4">
            <div className="flex gap-4">
              {recentlyWatched.map((ep) => (
                <div key={ep.id} className="flex-none w-[240px] md:w-[280px]">
                  <Link href={`/watch/${ep.id}`} className="group block relative rounded-lg overflow-hidden border border-white/5 hover:border-[var(--accent)]/50 transition-all shadow-lg portal-glow">
                    <div className="aspect-video relative">
                      <img 
                        src={thumbnails[ep.id]} 
                        alt={ep.name} 
                        className="object-cover w-full h-full grayscale group-hover:grayscale-0 transition-all" 
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-10 h-10 text-white fill-white" />
                      </div>
                      {/* Progress Bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div 
                          className="h-full bg-[var(--accent)]" 
                          style={{ width: `${(ep.progress.currentTime / ep.progress.duration) * 100}%` }} 
                        />
                      </div>
                    </div>
                    <div className="p-3 bg-zinc-900/90 backdrop-blur-md">
                      <h3 className="text-xs font-bold text-white truncate">{ep.name}</h3>
                      <p className="text-[10px] text-[var(--accent)] font-medium">{ep.episode}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {seasons.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="text-4xl mb-4">🛸</div>
          <h3 className="text-xl font-bold text-white mb-2">No episodes found in this dimension</h3>
          <p className="text-gray-500 max-w-xs">Maybe try a different search or hop to another reality.</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-6 text-[var(--accent)] font-bold hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Season Rows */}
      <div id="seasons">
        {seasons.map((season) => (
          <SeasonSection 
            key={season} 
            season={season} 
            episodes={episodesBySeason[season]}
            thumbnails={thumbnails}
            summaries={summaries}
          />
        ))}
      </div>
    </div>
  );
}
