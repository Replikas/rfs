import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent-glow)] rounded-full blur-[150px] animate-pulse-slower"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 md:px-12 py-12">
        {/* Back Button */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-glow)] bg-clip-text text-transparent">
              About RickFlix
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Personal streaming platform for Rick and Morty fans
          </p>
        </div>

        {/* Legal Notice */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 backdrop-blur-sm mb-8">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-[var(--accent)]">⚖️</span> Legal Notice
          </h2>
          <div className="text-sm text-gray-400 leading-relaxed space-y-4">
            <p>
              This is a <strong className="text-gray-300">personal streaming platform</strong> created for educational, non-commercial, and private viewing purposes. 
              All content hosted on this platform has been <strong className="text-gray-300">legally purchased and owned</strong> by the site operator.
            </p>
            <p>
              This site is <strong className="text-gray-300">shared exclusively with friends and fans</strong> for personal viewing and does not sell, commercially distribute, or profit from copyrighted content. 
              All materials are used in accordance with fair use principles for personal media storage and sharing among a limited private audience.
            </p>
            <p className="text-gray-500 italic">
              Rick and Morty™ is property of Adult Swim and its respective copyright holders. This site is not affiliated with or endorsed by Adult Swim, Cartoon Network, or Warner Bros. Discovery.
            </p>
          </div>
        </div>

        {/* Platform Info */}
        <div className="bg-white/5 border border-white/10 rounded-lg p-8 backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-[var(--accent)]">📺</span> About This Platform
          </h2>
          <div className="text-sm text-gray-400 leading-relaxed space-y-4">
            <p>
              RickFlix is a personal media streaming platform designed to provide a modern, Netflix-like viewing experience for Rick and Morty episodes. 
              Built with Next.js, Cloudflare R2, and TMDB integration for metadata.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4">
              <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                <div className="text-2xl font-black text-[var(--accent)] mb-1">81</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Episodes</div>
              </div>
              <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                <div className="text-2xl font-black text-[var(--accent)] mb-1">8</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Seasons</div>
              </div>
              <div className="bg-black/40 rounded-lg p-4 border border-white/5">
                <div className="text-2xl font-black text-[var(--accent)] mb-1">100%</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Available</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">
              Created by <span className="text-[var(--accent)]">rep</span> © 2025
            </p>
            <Link 
              href="https://ko-fi.com/replika"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-600 hover:text-[var(--accent)] transition-colors"
            >
              Ko-fi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
