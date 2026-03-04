// Rick's Interdimensional Comic Reader Component
"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ComicReader({ params }: { params: { slug: string } }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pages, setPages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Dynamic page discovery based on slug
    const fetchPages = async () => {
      // Hardcoded page counts for now because the filesystem API doesn't work on Vercel edge
      const counts: Record<string, number> = {
        'universe-1': 26,
        'the-end-2': 26
      }

      const count = counts[params.slug] || 0
      if (count > 0) {
        const list = Array.from({ length: count }, (_, i) => 
          `/comics/${params.slug}/page_${(i + 1).toString().padStart(3, '0')}.jpg`
        )
        setPages(list)
      }
      setLoading(false)
    }

    fetchPages()
  }, [params.slug])

  const next = () => {
    if (currentIndex < pages.length - 1) setCurrentIndex(currentIndex + 1)
  }

  const prev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, pages])

  if (loading) return <div className="min-h-screen bg-black text-green-500 font-mono p-10">CALIBRATING PORTAL...</div>
  if (pages.length === 0) return <div className="min-h-screen bg-black text-red-500 font-mono p-10">ERROR: NO UNIVERSE FOUND AT THIS COORDINATE. (404)</div>

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#00ff00] font-mono flex flex-col items-center">
      <div className="w-full bg-black border-b-2 border-[#00ff00] p-4 text-center">
        <h1 className="text-2xl font-bold tracking-tighter">RICK'S ILLEGAL COMIC PORTAL</h1>
        <p className="text-sm opacity-70">Reading: {params.slug.replace('-', ' ').toUpperCase()}</p>
      </div>

      <div className="max-w-[900px] w-full mt-5 shadow-[0_0_20px_rgba(0,255,0,0.2)]">
        <img 
          src={pages[currentIndex]} 
          alt={`Page ${currentIndex + 1}`} 
          className="w-full h-auto border-2 border-[#333]"
          onLoad={() => window.scrollTo(0, 0)}
        />
      </div>

      <div className="sticky bottom-0 w-full bg-black/80 p-6 flex justify-center gap-6 border-t border-[#444] mt-10">
        <button 
          onClick={prev}
          disabled={currentIndex === 0}
          className="px-6 py-2 border border-[#00ff00] bg-[#006400] hover:bg-[#008000] disabled:bg-[#333] disabled:border-[#666] disabled:text-[#888] font-bold"
        >
          PREV
        </button>
        <div className="leading-10 text-xl">
          Page {currentIndex + 1} / {pages.length}
        </div>
        <button 
          onClick={next}
          disabled={currentIndex === pages.length - 1}
          className="px-6 py-2 border border-[#00ff00] bg-[#006400] hover:bg-[#008000] disabled:bg-[#333] disabled:border-[#666] disabled:text-[#888] font-bold"
        >
          NEXT
        </button>
      </div>
    </div>
  )
}
