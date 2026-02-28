import { getAllEpisodes } from '@/lib/api';
import ClientHome from '@/components/ClientHome';
import { getThumbnailFromEpisodeCode, getEpisodeSummary } from '@/lib/tmdb';
import HeroSection from '@/components/HeroSection';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const episodes = await getAllEpisodes();
  
  // Logic to pick featured episodes:
  // 1. Prioritize Season 9 (newest drops)
  // 2. Fill the rest with random classics
  const s9Episodes = episodes.filter(e => e.episode.startsWith('S09')).reverse();
  const otherEpisodes = episodes.filter(e => !e.episode.startsWith('S09')).sort(() => 0.5 - Math.random());
  
  const featuredEpisodes = [...s9Episodes, ...otherEpisodes].slice(0, 5);

  // Fetch all thumbnails and summaries
  const thumbnails: Record<number, string> = {};
  const summaries: Record<number, string> = {};
  await Promise.all(
    episodes.map(async (ep) => {
      thumbnails[ep.id] = await getThumbnailFromEpisodeCode(ep.episode);
      summaries[ep.id] = await getEpisodeSummary(ep.episode);
    })
  );

  return (
    <main className="min-h-screen bg-black relative overflow-hidden">
      
      {/* Modern Header */}
      <div className="fixed top-0 left-0 right-0 z-[100] transition-colors duration-500 bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="px-4 md:px-12 py-2.5 md:py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 md:gap-16">
            <h1 className="text-lg md:text-2xl font-black tracking-tighter cursor-crosshair shrink-0">
              <Link href="/" className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-glow)] bg-clip-text text-transparent">
                RickFlix
              </Link>
            </h1>
            <nav className="hidden sm:flex items-center gap-4 md:gap-8 text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-gray-400 shrink-0">
              <Link href="/" className="text-white hover:text-[var(--accent)] transition-colors">Home</Link>
              <Link href="#seasons" className="hover:text-white transition-colors">Seasons</Link>
              <Link href="/about" className="hover:text-white transition-colors">About</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 md:gap-6 text-white/60">
            <Link 
              href="/groupwatch/1"
              className="text-[8px] md:text-[9px] text-[var(--accent-glow)] font-black tracking-[0.1em] md:tracking-[0.2em] px-2 py-1 md:px-3 md:py-1 rounded-full border border-[var(--accent-glow)] hover:bg-[var(--accent-glow)] hover:text-black transition-all"
            >
              GROUPWATCH
            </Link>
            <Link 
              href="/report/general"
              className="text-[8px] md:text-[9px] hover:text-[var(--accent)] font-bold tracking-wider transition-colors hidden xs:block"
            >
              REPORT
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <HeroSection featuredEpisodes={featuredEpisodes} summaries={summaries} />

      <div className="relative z-10">
        <ClientHome 
          initialEpisodes={episodes} 
          thumbnails={thumbnails} 
          summaries={summaries} 
        />
      </div>

      <footer className="relative px-4 md:px-12 py-8 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-medium">
            Created by <span className="text-[var(--accent)]">rep</span> © 2025
          </div>
          <div className="flex items-center gap-6">
            <a href="/about" className="text-xs text-gray-500 hover:text-white transition-colors">About & Legal</a>
            <a href="https://ko-fi.com/replika" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-white transition-colors">Ko-fi</a>
          </div>
          <div className="text-[10px] text-gray-700 tracking-widest">RICKFLIX™</div>
        </div>
      </footer>
    </main>
  );
}
