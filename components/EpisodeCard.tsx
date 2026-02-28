'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Episode } from '@/lib/api';
import { Play } from 'lucide-react';
import { getWatchProgress, getProgressPercentage } from '@/lib/watchProgress';

interface EpisodeCardProps {
  episode: Episode;
  thumbnail: string;
  summary: string;
}

export default function EpisodeCard({ episode, thumbnail, summary }: EpisodeCardProps) {
  const progress = getWatchProgress(episode.id);
  const percentage = getProgressPercentage(progress);

  return (
    <Link 
      href={`/watch/${episode.id}`}
      className="group relative block transition-all duration-300 hover:z-50"
    >
      {/* Card Container - Expands on hover */}
      <div className="relative bg-zinc-900 rounded-lg overflow-hidden shadow-lg">
        
        {/* Thumbnail Section */}
        <div className="relative aspect-video overflow-hidden">
          <Image
            src={thumbnail}
            alt={episode.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 320px"
            unoptimized={thumbnail.startsWith('http')}
          />
          
          {/* Progress Bar Overlay */}
          {percentage > 0 && percentage < 95 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
              <div 
                className="h-full bg-[var(--accent)]" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          )}
          
          {/* Completed Badge */}
          {percentage >= 95 && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
              <div className="bg-[var(--accent)]/90 text-white text-[10px] font-black px-2 py-1 rounded tracking-tighter">WATCHED</div>
            </div>
          )}

          {/* Gradient Overlay - Stronger on mobile for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent md:from-black/60 md:via-transparent" />
          
          {/* Episode Number Badge */}
          <div className="absolute top-2 right-2 md:top-3 md:right-3 bg-black/80 backdrop-blur-sm px-2 py-1 md:px-2.5 md:py-1.5 rounded text-xs font-bold text-white">
            {episode.episode}
          </div>

          {/* Coming Soon Badge (for TBA episodes) */}
          {episode.air_date.includes('TBA') && (
            <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-cyan-500/90 backdrop-blur-sm px-2 py-1 md:px-2.5 md:py-1.5 rounded text-xs font-bold text-white flex items-center gap-1">
              🚀 2026
            </div>
          )}
          
          {/* Mobile: Episode Title Overlay */}
          <div className="md:hidden absolute inset-x-0 bottom-0 p-2 z-30">
            <div className="bg-black/60 backdrop-blur-md rounded-md p-2 border border-white/10">
              <h3 className="text-[10px] font-black text-white leading-tight line-clamp-1 uppercase tracking-tighter">
                {episode.name}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[8px] text-[var(--accent)] font-bold">{episode.episode}</span>
                <span className="w-0.5 h-0.5 rounded-full bg-white/30" />
                <span className="text-[7px] text-gray-400 font-medium">{episode.air_date}</span>
              </div>
            </div>
          </div>
          
          {/* Play Button - Shows on hover (desktop only) */}
          <div className="hidden md:flex absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40">
            <button className="flex items-center justify-center w-14 h-14 rounded-full bg-white hover:bg-white/95 transition-colors">
              <Play className="w-6 h-6 text-black fill-black ml-1" />
            </button>
          </div>
        </div>
        
        {/* Info Dropdown - Expands on hover (desktop only) */}
        <div className="hidden md:block bg-black/70 backdrop-blur-xl rounded-b-lg max-h-0 group-hover:max-h-[180px] overflow-hidden transition-all duration-300 border-t border-white/10">
          <div className="p-5 h-[180px] flex flex-col">
            {/* Episode Title */}
            <h3 className="text-base font-bold text-white leading-tight line-clamp-2 mb-2">
              {episode.name}
            </h3>
            
            {/* Episode Summary */}
            {summary && (
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-3 mb-2 flex-1">
                {summary}
              </p>
            )}
            
            {/* Air Date */}
            <p className="text-xs text-gray-500 mt-auto">
              {episode.air_date}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
