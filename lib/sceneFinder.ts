import fs from 'node:fs/promises';
import path from 'node:path';

import type { Episode } from './api';

const TRANSCRIPTS_DIR = '/home/openclaw/.openclaw/workspace/TRANSCRIPTS/episodes';
const CONTEXT_RADIUS = 2;
const MAX_RESULTS = 50;

export interface SceneSearchResult {
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

interface IndexedLine {
  lineNumber: number;
  speaker: string | null;
  text: string;
  normalized: string;
}

interface IndexedTranscript {
  episodeId: number;
  episodeCode: string;
  episodeName: string;
  transcriptFile: string;
  lines: IndexedLine[];
}

let transcriptCache: IndexedTranscript[] | null = null;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function filenameBase(file: string): string {
  return file.replace(/\.txt$/i, '');
}

function slugifyName(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/['’]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function transcriptCandidates(episode: Episode): string[] {
  const code = episode.episode.toUpperCase();
  const seasonMatch = code.match(/^S(\d+)E(\d+)$/);
  const season = seasonMatch ? Number(seasonMatch[1]) : null;
  const episodeNum = seasonMatch ? Number(seasonMatch[2]) : null;
  const base = slugifyName(episode.name);

  const candidates = new Set<string>([
    base,
    `${base}_episode`,
  ]);

  if (season === 1 && episodeNum === 10) {
    candidates.add('Close_Rick-Counters_of_the_Rick_Kind');
  }

  if (season === 2 && episodeNum === 5) {
    candidates.add('Get_Schwifty_episode');
  }

  if (season === 6 && episodeNum === 4) {
    candidates.add('Night_Family_episode');
  }

  return Array.from(candidates);
}

function parseTranscript(content: string): IndexedLine[] {
  const rawLines = content.split(/\r?\n/);
  const parsed: IndexedLine[] = [];

  rawLines.forEach((rawLine, index) => {
    const text = rawLine.trim();
    if (!text || text.startsWith('#') || (text.startsWith('[') && text.endsWith(']'))) {
      return;
    }

    const speakerMatch = text.match(/^([A-Za-z0-9 .“”'’()\-]+?):\s*(.+)$/);
    const speaker = speakerMatch ? speakerMatch[1].trim() : null;
    const spokenText = speakerMatch ? speakerMatch[2].trim() : text;
    const normalized = normalize(spokenText);

    if (!normalized) {
      return;
    }

    parsed.push({
      lineNumber: index + 1,
      speaker,
      text: spokenText,
      normalized,
    });
  });

  return parsed;
}

async function buildTranscriptIndex(episodes: Episode[]): Promise<IndexedTranscript[]> {
  const files = await fs.readdir(TRANSCRIPTS_DIR);
  const fileMap = new Map(files.map((file) => [filenameBase(file), file]));

  const indexed = await Promise.all(
    episodes.map(async (episode) => {
      const transcriptFile = transcriptCandidates(episode)
        .map((candidate) => fileMap.get(candidate))
        .find(Boolean);

      if (!transcriptFile) {
        return null;
      }

      const fullPath = path.join(TRANSCRIPTS_DIR, transcriptFile);
      const content = await fs.readFile(fullPath, 'utf8');

      return {
        episodeId: episode.id,
        episodeCode: episode.episode,
        episodeName: episode.name,
        transcriptFile,
        lines: parseTranscript(content),
      } satisfies IndexedTranscript;
    })
  );

  return indexed.filter((entry): entry is IndexedTranscript => Boolean(entry));
}

export async function getTranscriptIndex(episodes: Episode[]): Promise<IndexedTranscript[]> {
  if (!transcriptCache) {
    transcriptCache = await buildTranscriptIndex(episodes);
  }

  return transcriptCache;
}

export async function searchScenes(query: string, episodes: Episode[]): Promise<SceneSearchResult[]> {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [];
  }

  const queryTerms = normalizedQuery.split(' ').filter(Boolean);
  const transcripts = await getTranscriptIndex(episodes);
  const results: SceneSearchResult[] = [];

  for (const transcript of transcripts) {
    transcript.lines.forEach((line, index) => {
      let score = 0;

      if (line.normalized.includes(normalizedQuery)) {
        score += normalizedQuery.length * 4;
      }

      for (const term of queryTerms) {
        if (line.normalized.includes(term)) {
          score += term.length;
        }
      }

      if (!score) {
        return;
      }

      const contextBefore = transcript.lines
        .slice(Math.max(0, index - CONTEXT_RADIUS), index)
        .map((entry) => `${entry.speaker ? `${entry.speaker}: ` : ''}${entry.text}`);
      const contextAfter = transcript.lines
        .slice(index + 1, index + 1 + CONTEXT_RADIUS)
        .map((entry) => `${entry.speaker ? `${entry.speaker}: ` : ''}${entry.text}`);

      results.push({
        episodeId: transcript.episodeId,
        episodeCode: transcript.episodeCode,
        episodeName: transcript.episodeName,
        transcriptFile: transcript.transcriptFile,
        lineNumber: line.lineNumber,
        speaker: line.speaker,
        line: line.text,
        contextBefore,
        contextAfter,
        score,
      });
    });
  }

  return results
    .sort((a, b) => b.score - a.score || a.episodeCode.localeCompare(b.episodeCode) || a.lineNumber - b.lineNumber)
    .slice(0, MAX_RESULTS);
}
