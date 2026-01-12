export default async function Home() {

  return (
    <main className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-[150px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent-glow)] rounded-full blur-[150px] animate-pulse-slower"></div>
      </div>
      
      {/* Maintenance Notice */}
      <div className="relative z-10 max-w-2xl mx-auto px-6">
        <div className="bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 backdrop-blur-xl border border-yellow-500/30 rounded-2xl p-8 md:p-12 shadow-2xl">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-2">
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-glow)] bg-clip-text text-transparent">
                RickFlix
              </span>
            </h1>
          </div>

          {/* Icon */}
          <div className="text-center mb-6">
            <div className="inline-block text-6xl animate-bounce">🔧</div>
          </div>

          {/* Main Message */}
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-yellow-300 mb-4">
              Under Maintenance
            </h2>
            <p className="text-base md:text-lg text-gray-300 leading-relaxed mb-6">
              We're upgrading to <span className="text-yellow-300 font-semibold">Cloudflare R2</span> for faster streaming and better iPhone compatibility.
            </p>
            
            <div className="bg-black/30 rounded-lg p-4 mb-6">
              <p className="text-yellow-300 font-bold text-lg mb-2">Expected back online in 2-3 hours</p>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-400">Re-encoding 46 episodes for all devices...</span>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p className="mb-2">🚀 <strong>What's changing:</strong></p>
              <ul className="text-left inline-block text-gray-400 space-y-1">
                <li>• Faster video loading</li>
                <li>• iPhone/Safari support</li>
                <li>• Better streaming quality</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/10 text-center text-xs text-gray-600">
            Created by <span className="text-[var(--accent)]">rep</span> © 2025
          </div>
        </div>
      </div>
    </main>
  );
}
