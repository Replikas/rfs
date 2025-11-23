# RickFlix Transcoding Server

This is an on-the-fly HLS transcoding server that makes your videos compatible with iPhone/Safari.

## How It Works

1. iPhone/Safari users request a video
2. Server fetches the video from R2
3. Transcodes it to HLS format in real-time
4. Serves HLS playlist and segments
5. Caches transcoded segments for faster subsequent viewing

## Requirements

- **FFmpeg** must be installed on the server
- Node.js 14+

## Local Testing

1. Install dependencies:
```bash
cd transcoder
npm install
```

2. Make sure FFmpeg is installed:
```bash
ffmpeg -version
```

3. Start the server:
```bash
npm start
```

4. Server runs on http://localhost:3001

## Deploy to Railway (Recommended - FREE)

### Step 1: Push to GitHub (if not already)
```bash
cd transcoder
git init
git add .
git commit -m "Add transcoding server"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Sign up/login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository and the `transcoder` folder
5. Railway will auto-detect Node.js
6. Add **Build Pack** for FFmpeg:
   - Go to Settings → Build → Add Build Pack
   - Use: `heroku/nodejs` and `https://github.com/jonathanong/heroku-buildpack-ffmpeg-latest`
7. Deploy!

### Step 3: Get Your Server URL

Railway will give you a URL like: `https://your-app.railway.app`

### Step 4: Update Your Next.js Site

Add to your `.env.local`:
```
NEXT_PUBLIC_TRANSCODER_URL=https://your-app.railway.app
```

## Deploy to Render (Alternative - FREE)

1. Go to https://render.com
2. New → Web Service
3. Connect your GitHub repo
4. Root Directory: `transcoder`
5. Build Command: `npm install`
6. Start Command: `npm start`
7. Add environment variable:
   - Name: `FFMPEG_PATH`
   - Value: `/usr/bin/ffmpeg`
8. Deploy!

## Environment Variables

No environment variables needed! The server automatically:
- Uses R2 public URL
- Creates cache directory
- Serves on PORT from environment (Railway/Render set this automatically)

## API Endpoints

- `GET /health` - Health check
- `GET /hls/:episodeId/master.m3u8` - HLS master playlist
- `GET /hls/:episodeId/playlist.m3u8` - HLS variant playlist  
- `GET /hls/:episodeId/:segment` - HLS video segments
- `DELETE /cache/:episodeId` - Clear cache for episode
- `DELETE /cache` - Clear all cache

## Performance

- **First viewing**: 10-30 seconds to start (transcoding begins)
- **Subsequent viewings**: Instant (served from cache)
- **Cache size**: ~500MB per episode (HLS segments)

## Cost

- **Railway**: 500 hours/month FREE (enough for personal use)
- **Render**: 750 hours/month FREE
- **No bandwidth charges** for reasonable personal use

## Troubleshooting

### "FFmpeg not found" error
Make sure FFmpeg buildpack is added in Railway/Render settings.

### Videos not loading
Check server logs - Railway/Render dashboards show real-time logs.

### Slow transcoding
First-time transcoding takes time. Subsequent views use cache and are instant.
