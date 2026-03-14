export interface HeroClipWindowConfig {
  start?: string;
  duration?: number;
  label?: string;
}

export interface HeroClipConfig {
  defaults?: HeroClipWindowConfig;
  episodes?: Record<string, HeroClipWindowConfig>;
}

export function normalizeEpisodeKey(value: string | number): string {
  const raw = String(value).trim().toLowerCase();
  const match = raw.match(/episode-(\d+)/i) ?? raw.match(/(\d+)/);

  if (!match) {
    return raw;
  }

  return `episode-${Number.parseInt(match[1], 10)}`;
}

export function resolveHeroClipWindow(config: HeroClipConfig, episodeKey: string): Required<HeroClipWindowConfig> {
  const defaults = config.defaults ?? {};
  const episodeOverrides = config.episodes?.[normalizeEpisodeKey(episodeKey)] ?? {};

  return {
    start: episodeOverrides.start ?? defaults.start ?? '00:00:30',
    duration: episodeOverrides.duration ?? defaults.duration ?? 12,
    label: episodeOverrides.label ?? defaults.label ?? 'hero',
  };
}
