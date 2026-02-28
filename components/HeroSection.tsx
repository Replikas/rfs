'use client';

import { Episode } from '@/lib/api';
import { Play, Info, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

interface HeroSectionProps {
  featuredEpisodes: Episode[];
  summaries: Record<number, string>;
}

export default function HeroSection({ featuredEpisodes, summaries }: HeroSectionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [backdrop, setBackdrop] = useState<string>('');
  const [isPlaceholder, setIsPlaceholder] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const currentEpisode = featuredEpisodes[currentIndex];
  const currentSummary = summaries[currentEpisode.id];

  const updateBackdrop = useCallback((episodeCode: string) => {
    fetch(`/api/episode-backdrop?code=${episodeCode}`)
      .then(res => res.json())
      .then(data => {
        setBackdrop(data.backdrop);
        setIsPlaceholder(data.isPlaceholder || false);
      })
      .catch(() => {
        setBackdrop('https://images4.alphacoders.com/131/1313607.png');
        setIsPlaceholder(false);
      });
  }, []);

  useEffect(() => {
    updateBackdrop(currentEpisode.episode);
  }, [currentIndex, currentEpisode.episode, updateBackdrop]);

  // Auto-rotation logic
  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 15000); // Rotate every 15 seconds
    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    setIsExiting(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredEpisodes.length);
      setIsExiting(false);
      setShowInfo(false);
    }, 500);
  };

  const handlePrev = () => {
    setIsExiting(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + featuredEpisodes.length) % featuredEpisodes.length);
      setIsExiting(false);
      setShowInfo(false);
    }, 500);
  };

  return (
    <div className="relative h-[55vh] md:h-[95vh] w-full overflow-hidden bg-black pt-[70px] md:pt-[80px]">
      {/* Background Image with Ken Burns Effect */}
      <div className={`absolute inset-0 transition-all duration-1000 ${isExiting ? 'opacity-0 scale-110' : 'opacity-100'}`}>
        <div 
          className="absolute inset-0 bg-cover bg-top md:bg-center animate-ken-burns transition-opacity duration-1000"
          style={{ backgroundImage: `url(${backdrop})` }}
        />
        
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent z-10 opacity-60" />
      </div>

      {/* Content Overlay */}
      <div className={`relative z-20 h-full flex flex-col justify-center md:justify-end px-6 md:px-16 pb-20 md:pb-32 transition-all duration-700 ${isExiting ? 'translate-y-10 opacity-0' : 'translate-y-0 opacity-100'}`}>
        
        <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-md md:max-w-4xl mx-auto md:mx-0 w-full mb-0 pt-0">
          {/* Animated Episode Tag */}
          <div className="flex items-center gap-2 mb-2 animate-fade-in">
            <span className="flex items-center gap-1.2 bg-black/40 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/10 text-white/90 text-[9px] md:text-xs font-black tracking-[0.2em] uppercase">
              <Zap size={10} className="text-[var(--accent)] fill-current" />
              S{currentEpisode.episode.substring(1, 3)} • E{currentEpisode.episode.substring(4)}
            </span>
          </div>

          {/* Aggressive Cinematic Title */}
          <div className="overflow-visible mb-4 md:mb-6 w-full group max-w-3xl">
            <h1 className="text-[clamp(1.8rem,8vw,3rem)] md:text-[clamp(3rem,5vw,5rem)] font-black text-white tracking-tighter leading-[1.05] italic uppercase drop-shadow-[0_15px_45px_rgba(0,0,0,0.9)] py-1 select-none transition-transform duration-300">
              {currentEpisode.name}
            </h1>
          </div>

          {/* Summary - Improved Readability with subtle background */}
          <div className="max-w-2xl mb-6 md:mb-10 hidden md:block">
            <div className="relative">
              <p className="text-lg text-gray-100 line-clamp-3 font-medium leading-relaxed drop-shadow-lg opacity-90 border-l-4 border-[var(--accent)] pl-6 py-1">
                {currentSummary || `The multiversal chaos of ${currentEpisode.episode}.`}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-row gap-3 w-full md:w-auto items-center">
            <Link 
              href={`/watch/${currentEpisode.id}`}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-white text-black px-6 md:px-12 py-2.5 md:py-4 rounded-md font-black text-sm md:text-xl transition-all hover:bg-[var(--accent)] hover:text-white active:scale-95 shadow-2xl hover:shadow-[0_0_30px_rgba(0,181,204,0.4)] group"
            >
              <Play className="fill-current w-4 h-4 md:w-6 md:h-6 group-hover:scale-110 transition-transform" />
              PLAY
            </Link>
            <Link 
              href={`/watch/${currentEpisode.id}`}
              className="flex-1 md:flex-none flex items-center justify-center gap-3 bg-gray-500/20 backdrop-blur-xl text-white px-6 md:px-12 py-2.5 md:py-4 rounded-md font-bold text-sm md:text-xl transition-all hover:bg-gray-500/40 active:scale-95 border border-white/10 group shadow-xl"
            >
              <Info className="w-4 h-4 md:w-6 md:h-6 group-hover:rotate-12 transition-transform" />
              <span className="md:hidden">INFO</span>
              <span className="hidden md:inline">MORE INFO</span>
            </Link>
          </div>

          {/* Episode Info Panel */}
          {showInfo && (
            <div className="mt-4 w-full max-w-2xl bg-black/80 backdrop-blur-md rounded-lg border border-white/10 p-4 md:p-6 animate-fade-in">
              <p className="text-sm md:text-base text-gray-200 leading-relaxed">
                {currentSummary || "No summary available for this episode."}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                <span>{currentEpisode.episode}</span>
                {currentEpisode.air_date && <span>Aired: {currentEpisode.air_date}</span>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Index Indicators */}
      <div className="absolute bottom-[4.5rem] md:bottom-12 left-1/2 -translate-x-1/2 z-30 flex gap-2 md:gap-3">
        {featuredEpisodes.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-1.5 transition-all duration-500 rounded-full ${i === currentIndex ? 'w-10 md:w-14 bg-[var(--accent)] shadow-[0_0_15px_var(--accent)]' : 'w-2 md:w-3 bg-white/20 hover:bg-white/40'}`}
          />
        ))}
      </div>
    </div>
  );
}
