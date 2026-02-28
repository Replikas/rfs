const express = require('express');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const streamPipeline = promisify(pipeline);

const app = express();
const PORT = process.env.PORT || 3001;
const R2_PUBLIC_URL = 'https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev';

// Check if FFmpeg is available
const { exec } = require('child_process');
exec('ffmpeg -version', (error, stdout) => {
  if (error) {
    console.error('❌ FFmpeg not found!', error);
  } else {
    console.log('✅ FFmpeg is available:', stdout.split('\n')[0]);
  }
});

// Enable CORS for all origins
app.use(cors());

// Cache directory for transcoded segments
const CACHE_DIR = path.join(__dirname, 'cache');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Serve static cache files
app.use('/cache', express.static(CACHE_DIR));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Transcoding server running' });
});

// HLS Master Playlist endpoint
app.get('/hls/:episodeId/master.m3u8', async (req, res) => {
  const { episodeId } = req.params;
  
  // Simple master playlist pointing to our variant playlist
  const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2000000,RESOLUTION=1280x720
/hls/${episodeId}/playlist.m3u8
`;

  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(masterPlaylist);
});

// HLS Variant Playlist endpoint
app.get('/hls/:episodeId/playlist.m3u8', async (req, res) => {
  const { episodeId } = req.params;
  const videoUrl = `${R2_PUBLIC_URL}/videos/episode-${episodeId}.mp4`;
  const episodeDir = path.join(CACHE_DIR, episodeId);
  const playlistPath = path.join(episodeDir, 'playlist.m3u8');

  try {
    // Check if playlist already exists
    if (fs.existsSync(playlistPath)) {
      console.log(`Serving cached playlist for episode ${episodeId}`);
      const playlist = fs.readFileSync(playlistPath, 'utf8');
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(playlist);
      return;
    }

    // Create episode directory
    if (!fs.existsSync(episodeDir)) {
      fs.mkdirSync(episodeDir, { recursive: true });
    }

    console.log(`Transcoding episode ${episodeId} to HLS...`);

    // Download video to temp file first (more reliable than streaming)
    const tempVideoPath = path.join(episodeDir, 'temp.mp4');
    console.log(`Downloading video from R2...`);
    
    const response = await fetch(videoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch video: ${response.statusText}`);
    }

    // Save to temp file
    const fileStream = fs.createWriteStream(tempVideoPath);
    await streamPipeline(response.body, fileStream);
    console.log(`Download complete. Starting transcoding...`);

    // Transcode video to HLS format (iPhone compatible)
    ffmpeg(tempVideoPath)
      .outputOptions([
        '-c:v libx264',
        '-profile:v baseline',
        '-level 3.0',
        '-start_number 0',
        '-hls_time 10',
        '-hls_list_size 0',
        '-f hls',
        '-c:a aac',
        '-b:a 128k',
        '-ar 48000'
      ])
      .output(playlistPath)
      .on('start', (cmd) => {
        console.log('FFmpeg command:', cmd);
      })
      .on('progress', (progress) => {
        console.log(`Transcoding: ${Math.floor(progress.percent || 0)}%`);
      })
      .on('end', () => {
        console.log(`✅ Transcoding complete for episode ${episodeId}`);
        
        // Clean up temp file
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }
        
        // Serve the generated playlist
        const playlist = fs.readFileSync(playlistPath, 'utf8');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(playlist);
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error for episode', episodeId);
        console.error('Error message:', err.message);
        console.error('Error stack:', err.stack);
        
        // Clean up temp file
        if (fs.existsSync(tempVideoPath)) {
          fs.unlinkSync(tempVideoPath);
        }
        
        res.status(500).json({ error: 'Transcoding failed', details: err.message });
      })
      .run();

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to transcode video', details: error.message });
  }
});

// Serve HLS segments
app.get('/hls/:episodeId/:segment', (req, res) => {
  const { episodeId, segment } = req.params;
  const segmentPath = path.join(CACHE_DIR, episodeId, segment);

  if (!fs.existsSync(segmentPath)) {
    return res.status(404).json({ error: 'Segment not found' });
  }

  res.setHeader('Content-Type', 'video/mp2t');
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache segments for 1 year
  
  const stream = fs.createReadStream(segmentPath);
  stream.pipe(res);
});

// Clear cache for an episode
app.delete('/cache/:episodeId', (req, res) => {
  const { episodeId } = req.params;
  const episodeDir = path.join(CACHE_DIR, episodeId);

  if (fs.existsSync(episodeDir)) {
    fs.rmSync(episodeDir, { recursive: true, force: true });
    res.json({ message: `Cache cleared for episode ${episodeId}` });
  } else {
    res.status(404).json({ error: 'Episode cache not found' });
  }
});

// Clear all cache
app.delete('/cache', (req, res) => {
  if (fs.existsSync(CACHE_DIR)) {
    fs.rmSync(CACHE_DIR, { recursive: true, force: true });
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    res.json({ message: 'All cache cleared' });
  } else {
    res.json({ message: 'Cache already empty' });
  }
});

app.listen(PORT, () => {
  console.log(`🎬 RickFlix Transcoding Server running on port ${PORT}`);
  console.log(`📺 Ready to transcode videos for iPhone/Safari`);
  console.log(`💾 Cache directory: ${CACHE_DIR}`);
});
