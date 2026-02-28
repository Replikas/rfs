'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send } from 'lucide-react';
import { Episode } from '@/lib/api';

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [problemType, setProblemType] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/episodes`)
      .then(res => res.json())
      .then(episodes => {
        const ep = episodes.find((e: Episode) => e.id === parseInt(id));
        setEpisode(ep);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/report-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episodeId: id,
          episodeName: episode?.name,
          episodeCode: episode?.episode,
          problemType,
          description,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => router.push(`/watch/${id}`), 3000);
      } else {
        alert('Failed to submit report. Please try again.');
      }
    } catch (error) {
      alert('Error submitting report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!episode) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl p-8 max-w-md text-center border border-[var(--accent)]/20">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-white mb-2">Report Submitted!</h2>
          <p className="text-gray-400 mb-4">Thank you for helping me improve the site.</p>
          <p className="text-sm text-gray-500">Redirecting you back...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-2xl mx-auto">
        <Link 
          href={`/watch/${id}`}
          className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Episode
        </Link>

        <div className="bg-zinc-900/80 backdrop-blur-md rounded-xl p-8 border border-zinc-800">
          <h1 className="text-3xl font-bold text-white mb-2">Report a Problem</h1>
          <p className="text-gray-400 mb-6">
            Episode {episode.id}: {episode.name} ({episode.episode})
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white font-semibold mb-2">
                Problem Type *
              </label>
              <select
                required
                value={problemType}
                onChange={(e) => setProblemType(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                style={{
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%23999' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="" disabled>Select a problem type</option>
                <option value="video_not_loading">Video not loading</option>
                <option value="no_audio">No audio</option>
                <option value="buffering">Constant buffering</option>
                <option value="subtitles_out_of_sync">Subtitles out of sync</option>
                <option value="wrong_episode">Wrong episode</option>
                <option value="video_quality">Video quality issue</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">
                Description *
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please describe the problem in detail..."
                rows={5}
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-glow)] disabled:bg-gray-600 text-white font-bold py-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Report
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
