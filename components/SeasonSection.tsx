'use client';

import { Episode } from '@/lib/api';
import EpisodeCard from './EpisodeCard';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';

interface SeasonSectionProps {
  season: string;
  episodes: Episode[];
  thumbnails: Record<number, string>;
  summaries: Record<number, string>;
}

export default function SeasonSection({ season, episodes, thumbnails, summaries }: SeasonSectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -600 : 600;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      
      // Update arrow visibility
      setTimeout(() => {
        if (scrollRef.current) {
          const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
          setShowLeftArrow(scrollLeft > 0);
          setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
        }
      }, 300);
    }
  };

  return (
    <section className="mb-14 group/section">
      <div className="px-4 md:px-12 mb-6 flex items-center gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            Season {parseInt(season.replace('S', ''))}
          </h2>
          <div className="text-xs text-gray-600 font-medium tracking-wider">
            {episodes.length} EPISODES
          </div>
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent"></div>
      </div>
      <div className="relative group px-4 md:px-12">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-4 z-40 w-12 md:w-16 bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={3} />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-4 z-40 w-12 md:w-16 bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-8 h-8 md:w-10 md:h-10 text-white" strokeWidth={3} />
          </button>
        )}

        {/* Episodes Container */}
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto overflow-y-visible scrollbar-hide py-8 snap-x snap-mandatory scroll-smooth"
          onScroll={(e) => {
            const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
          }}
        >
          {episodes.map((ep) => (
            <div key={ep.id} className="flex-none w-[280px] md:w-[320px] snap-start">
              <EpisodeCard 
                episode={ep} 
                thumbnail={thumbnails[ep.id] || '/placeholder-thumbnail.jpg'}
                summary={summaries[ep.id] || ''}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
