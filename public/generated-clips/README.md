# Generated Hero Clips

This folder is filled by the local hero clip ingestion pipeline.

## Generate hero clips from local episode files

From the repo root:

```bash
node scripts/generate-hero-clips.js --dry-run
node scripts/generate-hero-clips.js --clean
```

What it does:
- discovers local episode source files from safe local directories (`downloads/`, `videos/`, `media/`, `episodes/`, and nearby repo folders)
- applies default or per-episode timing from `hero-clip-config.json`
- writes `.mp4`, `.webp`, `.jpg`, per-episode `.json`, and `index.json`
- keeps output in `public/generated-clips`, which the homepage hero already reads

## Useful flags

```bash
node scripts/generate-hero-clips.js --episode 1
node scripts/generate-hero-clips.js --episode episode-12 --episode 30
node scripts/generate-hero-clips.js --search-dir /path/to/local/videos
node scripts/generate-hero-clips.js --config hero-clip-config.json --clean
```

If no source files are found, the script exits cleanly and tells you which local directories were checked.
