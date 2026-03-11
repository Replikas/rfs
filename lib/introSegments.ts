export interface IntroSegment {
  start: number;
  end: number;
}

// Default intro timing used until episode-specific timestamps are added.
// Override individual episodes by adding entries to introSegments below.
export const DEFAULT_INTRO_SEGMENT: IntroSegment = {
  start: 0,
  end: 22,
};

export const introSegments: Record<number, IntroSegment> = {};

export function getIntroSegment(episodeId?: string | number | null): IntroSegment | null {
  if (episodeId === undefined || episodeId === null) return DEFAULT_INTRO_SEGMENT;

  const numericId = typeof episodeId === 'string' ? parseInt(episodeId, 10) : episodeId;
  if (Number.isNaN(numericId)) return DEFAULT_INTRO_SEGMENT;

  return introSegments[numericId] ?? DEFAULT_INTRO_SEGMENT;
}
