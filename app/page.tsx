import { getAllEpisodes } from '@/lib/api';
import ClientHome from '@/components/ClientHome';
import { getThumbnailFromEpisodeCode, getEpisodeSummary } from '@/lib/tmdb';
import Link from 'next/link';

export default async function Home() {
  const episodes = await getAllEpisodes();

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
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent-glow)] rounded-full blur-[150px] animate-pulse-slower"></div>
      </div>
      
      {/* Modern Header */}
      <div className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <div className="px-4 md:px-12 py-4 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter cursor-crosshair">
            <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-glow)] bg-clip-text text-transparent glitch-hover">
              RickFlix
            </span>
          </h1>
          <div className="flex items-center gap-6">
            <Link 
              href="/groupwatch/1"
              className="text-[10px] text-[var(--accent-glow)] font-bold tracking-[0.2em] px-3 py-1 rounded-full border border-[var(--accent-glow)] hover:bg-[var(--accent-glow)] hover:text-black transition-all portal-glow"
            >
              GROUPWATCH
            </Link>
            <Link 
              href="/report/general"
              className="text-[10px] text-gray-500 hover:text-[var(--accent)] font-medium tracking-wider transition-colors"
            >
              REPORT ANOMALY
            </Link>
          </div>
        </div>
      </div>

      <ClientHome 
        initialEpisodes={episodes} 
        thumbnails={thumbnails} 
        summaries={summaries} 
      />

      <footer className="relative px-4 md:px-12 py-12 border-t border-white/5 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-xs text-gray-600 font-medium">
            Created by <span className="text-[var(--accent)]">rep</span> © 2025
          </div>
          <div className="flex items-center gap-4">
            <a href="/about" className="text-xs text-gray-600 hover:text-[var(--accent)] transition-colors">About & Legal</a>
            <a href="https://ko-fi.com/replika" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-600 hover:text-[var(--accent)] transition-colors">Ko-fi</a>
            <div className="text-xs text-gray-700 tracking-wider">RICKFLIX™</div>
          </div>
        </div>
      </footer>
    </main>
  );
}
