#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail(`${command} exited with status ${result.status}`);
}

function runCapture(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) fail((result.stderr || '').trim() || `${command} exited with status ${result.status}`);
  return result.stdout.trim();
}

const [, , inputArg, ...rest] = process.argv;
if (!inputArg) {
  fail('Usage: node scripts/generate-clips.js <video-file> [--start 00:01:23] [--duration 12] [--label teaser] [--out-dir public/generated-clips]');
}

let start = '00:00:30';
let duration = '12';
let label = 'clip';
let outDir = 'public/generated-clips';

for (let i = 0; i < rest.length; i += 1) {
  const flag = rest[i];
  const value = rest[i + 1];

  if (!value) fail(`Missing value for ${flag}`);

  if (flag === '--start') start = value;
  else if (flag === '--duration') duration = value;
  else if (flag === '--label') label = value;
  else if (flag === '--out-dir') outDir = value;
  else fail(`Unknown flag: ${flag}`);
}

const inputPath = path.resolve(process.cwd(), inputArg);
if (!fs.existsSync(inputPath)) fail(`Input file not found: ${inputPath}`);

const repoRoot = process.cwd();
const outputDir = path.resolve(repoRoot, outDir);
fs.mkdirSync(outputDir, { recursive: true });

const extless = path.basename(inputPath, path.extname(inputPath));
const safeLabel = label.replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
const clipBase = `${extless}-${safeLabel}`;
const mp4Path = path.join(outputDir, `${clipBase}.mp4`);
const webpPath = path.join(outputDir, `${clipBase}.webp`);
const posterPath = path.join(outputDir, `${clipBase}.jpg`);

run('ffmpeg', [
  '-y',
  '-ss', start,
  '-i', inputPath,
  '-t', duration,
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
  '-ss', start,
  '-i', inputPath,
  '-t', duration,
  '-vf', 'fps=12,scale=960:-1:flags=lanczos',
  '-loop', '0',
  '-an',
  webpPath,
]);

run('ffmpeg', [
  '-y',
  '-ss', start,
  '-i', inputPath,
  '-frames:v', '1',
  '-vf', 'scale=1280:-2',
  posterPath,
]);

const durationSeconds = runCapture('ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration',
  '-of', 'default=noprint_wrappers=1:nokey=1',
  mp4Path,
]);

const manifest = {
  source: inputPath,
  generatedAt: new Date().toISOString(),
  start,
  duration: Number.parseFloat(duration),
  outputs: {
    mp4: path.relative(repoRoot, mp4Path),
    webp: path.relative(repoRoot, webpPath),
    poster: path.relative(repoRoot, posterPath),
  },
  measuredDuration: Number.parseFloat(durationSeconds),
};

const manifestPath = path.join(outputDir, `${clipBase}.json`);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log('\n✅ Clip package generated');
console.log(`MP4: ${manifest.outputs.mp4}`);
console.log(`WEBP: ${manifest.outputs.webp}`);
console.log(`Poster: ${manifest.outputs.poster}`);
console.log(`Manifest: ${path.relative(repoRoot, manifestPath)}`);
