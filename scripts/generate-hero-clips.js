#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.mov', '.avi', '.webm', '.m4v']);
const DEFAULT_SEARCH_DIRS = [
  'downloads',
  'public/videos',
  'videos',
  'media',
  'episodes',
  '../downloads',
  '..',
];
const DEFAULT_CONFIG = {
  defaults: {
    start: '00:00:30',
    duration: 12,
    label: 'hero',
  },
  episodes: {},
};

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const options = {
    config: 'hero-clip-config.json',
    outDir: 'public/generated-clips',
    searchDirs: [],
    episodes: [],
    dryRun: false,
    clean: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];

    if (flag === '--config') {
      options.config = argv[++i] ?? fail('Missing value for --config');
    } else if (flag === '--out-dir') {
      options.outDir = argv[++i] ?? fail('Missing value for --out-dir');
    } else if (flag === '--search-dir') {
      options.searchDirs.push(argv[++i] ?? fail('Missing value for --search-dir'));
    } else if (flag === '--episode') {
      options.episodes.push(argv[++i] ?? fail('Missing value for --episode'));
    } else if (flag === '--dry-run') {
      options.dryRun = true;
    } else if (flag === '--clean') {
      options.clean = true;
    } else {
      fail(`Unknown flag: ${flag}`);
    }
  }

  return options;
}

function run(command, args, capture = false) {
  const result = spawnSync(command, args, capture ? { encoding: 'utf8' } : { stdio: 'inherit' });

  if (result.error) {
    fail(result.error.message);
  }

  if (result.status !== 0) {
    const details = capture ? (result.stderr || result.stdout || '').trim() : '';
    fail(details || `${command} exited with status ${result.status}`);
  }

  return capture ? result.stdout.trim() : '';
}

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return DEFAULT_CONFIG;
  }

  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);

  return {
    defaults: {
      ...DEFAULT_CONFIG.defaults,
      ...(parsed.defaults || {}),
    },
    episodes: parsed.episodes || {},
  };
}

function normalizeEpisodeKey(value) {
  const raw = String(value).trim().toLowerCase();
  const match = raw.match(/episode-(\d+)/i) || raw.match(/(\d+)/);

  if (!match) {
    return raw;
  }

  return `episode-${Number.parseInt(match[1], 10)}`;
}

function resolveWindow(config, episodeKey) {
  const normalized = normalizeEpisodeKey(episodeKey);
  const overrides = config.episodes[normalized] || {};

  return {
    start: overrides.start || config.defaults.start || '00:00:30',
    duration: Number(overrides.duration || config.defaults.duration || 12),
    label: String(overrides.label || config.defaults.label || 'hero'),
  };
}

function collectFiles(startDir, results, seenDirs) {
  let stat;

  try {
    stat = fs.statSync(startDir);
  } catch {
    return;
  }

  if (!stat.isDirectory()) {
    return;
  }

  const realDir = fs.realpathSync(startDir);
  if (seenDirs.has(realDir)) {
    return;
  }
  seenDirs.add(realDir);

  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);

    if (entry.isDirectory()) {
      if (['node_modules', '.git', '.next'].includes(entry.name)) {
        continue;
      }

      collectFiles(fullPath, results, seenDirs);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (VIDEO_EXTENSIONS.has(ext)) {
      results.push(fullPath);
    }
  }
}

function scoreCandidate(filePath, episodeId) {
  const normalized = filePath.toLowerCase();
  const basename = path.basename(normalized);
  const padded = String(episodeId).padStart(2, '0');
  let score = 0;

  if (new RegExp(`(^|[^a-z0-9])episode[-_ ]0*${episodeId}([^a-z0-9]|$)`).test(basename)) score += 100;
  if (new RegExp(`(^|[^a-z0-9])ep[-_ ]?0*${episodeId}([^a-z0-9]|$)`).test(basename)) score += 80;
  if (new RegExp(`(^|[^a-z0-9])s[0-9]{1,2}e${padded}([^a-z0-9]|$)`).test(basename)) score += 75;
  if (new RegExp(`(^|[^a-z0-9])e${padded}([^a-z0-9]|$)`).test(basename)) score += 40;
  if (normalized.includes('/downloads/')) score += 10;
  if (normalized.endsWith('.mp4')) score += 5;

  return score;
}

function findEpisodeSources(searchDirs) {
  const allFiles = [];
  const seenDirs = new Set();

  for (const dir of searchDirs) {
    collectFiles(dir, allFiles, seenDirs);
  }

  const scoredCandidates = allFiles
    .map(filePath => {
      const episodeScores = [];

      for (let episodeId = 1; episodeId <= 81; episodeId += 1) {
        const score = scoreCandidate(filePath, episodeId);
        if (score > 0) {
          episodeScores.push({ episodeId, score });
        }
      }

      return {
        filePath,
        episodeScores,
      };
    })
    .filter(candidate => candidate.episodeScores.length > 0)
    .sort((a, b) => a.filePath.localeCompare(b.filePath));

  const byEpisode = new Map();
  const usedPaths = new Set();

  for (let episodeId = 1; episodeId <= 81; episodeId += 1) {
    const bestCandidate = scoredCandidates
      .map(candidate => ({
        filePath: candidate.filePath,
        score: candidate.episodeScores.find(item => item.episodeId === episodeId)?.score ?? 0,
      }))
      .filter(candidate => candidate.score > 0 && !usedPaths.has(candidate.filePath))
      .sort((a, b) => b.score - a.score || a.filePath.localeCompare(b.filePath))[0];

    if (bestCandidate) {
      byEpisode.set(`episode-${episodeId}`, bestCandidate.filePath);
      usedPaths.add(bestCandidate.filePath);
    }
  }

  return byEpisode;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeIfExists(filePath) {
  if (fs.existsSync(filePath)) {
    fs.rmSync(filePath, { force: true });
  }
}

function generateClipPackage(sourcePath, episodeKey, window, outputDir, repoRoot) {
  const safeLabel = window.label.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  const clipBase = `${episodeKey}-${safeLabel}`;
  const mp4Path = path.join(outputDir, `${clipBase}.mp4`);
  const webpPath = path.join(outputDir, `${clipBase}.webp`);
  const posterPath = path.join(outputDir, `${clipBase}.jpg`);
  const manifestPath = path.join(outputDir, `${clipBase}.json`);

  run('ffmpeg', [
    '-y',
    '-ss', window.start,
    '-i', sourcePath,
    '-t', String(window.duration),
    '-vf', 'scale=1280:-2',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '24',
    '-an',
    '-movflags', '+faststart',
    mp4Path,
  ]);

  run('ffmpeg', [
    '-y',
    '-ss', window.start,
    '-i', sourcePath,
    '-t', String(window.duration),
    '-vf', 'fps=12,scale=960:-1:flags=lanczos',
    '-loop', '0',
    '-an',
    webpPath,
  ]);

  run('ffmpeg', [
    '-y',
    '-ss', window.start,
    '-i', sourcePath,
    '-frames:v', '1',
    '-vf', 'scale=1280:-2',
    posterPath,
  ]);

  const durationSeconds = run('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    mp4Path,
  ], true);

  const manifest = {
    episodeId: Number.parseInt(episodeKey.replace('episode-', ''), 10),
    episodeKey,
    source: sourcePath,
    generatedAt: new Date().toISOString(),
    start: window.start,
    duration: window.duration,
    outputs: {
      mp4: path.relative(repoRoot, mp4Path),
      webp: path.relative(repoRoot, webpPath),
      poster: path.relative(repoRoot, posterPath),
    },
    measuredDuration: Number.parseFloat(durationSeconds),
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return manifest;
}

function writeIndex(outputDir, manifests) {
  const indexPath = path.join(outputDir, 'index.json');
  fs.writeFileSync(indexPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), clips: manifests }, null, 2)}\n`);
}

function main() {
  const repoRoot = process.cwd();
  const options = parseArgs(process.argv.slice(2));
  const configPath = path.resolve(repoRoot, options.config);
  const outputDir = path.resolve(repoRoot, options.outDir);
  const config = loadConfig(configPath);
  const searchDirs = [...new Set((options.searchDirs.length > 0 ? options.searchDirs : DEFAULT_SEARCH_DIRS)
    .map(dir => path.resolve(repoRoot, dir))
    .filter(dir => fs.existsSync(dir)))];

  if (searchDirs.length === 0) {
    fail('No local search directories exist. Add files under downloads/, videos/, media/, or pass --search-dir.');
  }

  const discoveredSources = findEpisodeSources(searchDirs);
  const requestedEpisodes = options.episodes.length > 0
    ? options.episodes.map(normalizeEpisodeKey)
    : Array.from(discoveredSources.keys()).sort((a, b) => Number(a.replace('episode-', '')) - Number(b.replace('episode-', '')));

  if (requestedEpisodes.length === 0) {
    console.log('ℹ️ No local episode source files found. Checked:');
    for (const dir of searchDirs) {
      console.log(`   - ${path.relative(repoRoot, dir) || '.'}`);
    }
    console.log('Drop local episode files into one of those directories or pass --search-dir /path/to/files.');
    process.exit(0);
  }

  const missingEpisodes = requestedEpisodes.filter(episodeKey => !discoveredSources.has(episodeKey));
  if (missingEpisodes.length > 0) {
    console.log(`⚠️ Skipping ${missingEpisodes.length} episode(s) with no local source: ${missingEpisodes.join(', ')}`);
  }

  const generationPlan = requestedEpisodes
    .filter(episodeKey => discoveredSources.has(episodeKey))
    .map(episodeKey => ({
      episodeKey,
      sourcePath: discoveredSources.get(episodeKey),
      window: resolveWindow(config, episodeKey),
    }));

  if (generationPlan.length === 0) {
    console.log('ℹ️ No matching local source files were found for the requested episodes.');
    process.exit(0);
  }

  console.log(`🎬 Found ${generationPlan.length} episode source(s) for hero clip generation.`);
  for (const item of generationPlan) {
    console.log(`   - ${item.episodeKey}: ${path.relative(repoRoot, item.sourcePath)} @ ${item.window.start} for ${item.window.duration}s`);
  }

  if (options.dryRun) {
    console.log('\nDry run only. No files were written.');
    process.exit(0);
  }

  ensureDir(outputDir);

  if (options.clean) {
    const existingFiles = fs.readdirSync(outputDir);
    for (const file of existingFiles) {
      if (file === '.gitkeep' || file === 'README.md') {
        continue;
      }

      removeIfExists(path.join(outputDir, file));
    }
  }

  const manifests = [];
  for (const item of generationPlan) {
    console.log(`\n▶ Generating ${item.episodeKey}...`);
    const manifest = generateClipPackage(item.sourcePath, item.episodeKey, item.window, outputDir, repoRoot);
    manifests.push(manifest);
  }

  writeIndex(outputDir, manifests);

  console.log(`\n✅ Generated ${manifests.length} hero clip package(s) in ${path.relative(repoRoot, outputDir)}`);
}

main();
