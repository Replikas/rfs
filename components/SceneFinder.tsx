'use client';

import { Search, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useMemo, useState } from 'react';

interface SceneSearchResult {
  episodeId: number;
  episodeCode: string;
  episodeName: string;
  transcriptFile: string;
  lineNumber: number;
  speaker: string | null;
  line: string;
  contextBefore: string[];
  contextAfter: string[];
  score: number;
}

export default function SceneFinder() {
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [results, setResults] = useState<SceneSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const subtitle = useMemo(() => {
    if (!submittedQuery) {
      return 'Search transcript lines, half-remembered quotes, and scene dialogue across the whole multiverse.';
    }

    return results.length
      ? `${results.length} scene hit${results.length === 1 ? '' : 's'} for “${submittedQuery}”.`
      : `No transcript hits for “${submittedQuery}”.`;
  }, [results.length, submittedQuery]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) {
      setSubmittedQuery('');
      setResults([]);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    setSubmittedQuery(trimmed);

    try {
      const response = await fetch(`/api/scene-finder?q=${encodeURIComponent(trimmed)}`);
      if (!response.ok) {
        throw new Error(`scene search failed (${response.status})`);
      }

      const data = await response.json();
      setResults(data.results ?? []);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : 'scene search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="px-4 md:px-12 py-8 md:py-12 border-y border-white/10 bg-gradient-to-b from-black via-zinc-950 to-black">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-3 text-[var(--accent-glow)]">
          <Sparkles className="w-5 h-5" />
          <p className="text-[10px] uppercase tracking-[0.3em] font-black">Scene Finder</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">Find the exact line.</h2>
            <p className="text-sm md:text-base text-zinc-400 max-w-2xl mt-2">{subtitle}</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="relative mb-6">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zinc-500">
            <Search className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try: &quot;wubba&quot; ... no wait, don't. Try &quot;two plus two&quot; or &quot;vat of acid&quot;."
            className="w-full rounded-2xl border border-white/15 bg-black/80 pl-12 pr-36 py-4 text-white text-sm md:text-base outline-none focus:border-[var(--accent)] transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bottom-2 px-4 md:px-6 rounded-xl bg-[var(--accent)] text-black text-xs md:text-sm font-black tracking-[0.2em] uppercase disabled:opacity-60"
          >
            {loading ? 'Searching…' : 'Scan Scenes'}
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {results.map((result) => (
            <article
              key={`${result.episodeId}-${result.lineNumber}-${result.score}`}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--accent-glow)] font-black">{result.episodeCode}</p>
                  <h3 className="text-lg md:text-xl font-bold text-white">{result.episodeName}</h3>
                  <p className="text-xs text-zinc-500">Transcript line {result.lineNumber}</p>
                </div>
                <Link
                  href={`/watch/${result.episodeId}`}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--accent)] px-4 py-2 text-xs font-black tracking-[0.18em] uppercase text-[var(--accent-glow)] hover:bg-[var(--accent)] hover:text-black transition-colors"
                >
                  Open Episode
                </Link>
              </div>

              {result.contextBefore.length > 0 && (
                <div className="space-y-1 text-sm text-zinc-500 mb-3">
                  {result.contextBefore.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              )}

              <blockquote className="rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-3 text-sm md:text-base text-white">
                <span className="text-[var(--accent-glow)] font-bold">{result.speaker ? `${result.speaker}: ` : ''}</span>
                {result.line}
              </blockquote>

              {result.contextAfter.length > 0 && (
                <div className="space-y-1 text-sm text-zinc-500 mt-3">
                  {result.contextAfter.map((line, index) => (
                    <p key={index}>{line}</p>
                  ))}
                </div>
              )}
            </article>
          ))}

          {!loading && submittedQuery && !results.length && !error && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-400">
              No exact transcript hits. I can add fuzzy matching next if you want the half-remembered nonsense version too.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
