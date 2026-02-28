const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// Episodes that need compression
const LARGE_EPISODES = [
  { num: 41, season: 4, episode: 10 },
  { num: 54, season: 6, episode: 3 }
];

function findAllMP4s(dir) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(findAllMP4s(fullPath));
    } else if (item.name.endsWith('.mp4')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function compressFile(inputPath, outputPath) {
  console.log('  🎬 Compressing to fit under 1GB...');
  
  // Use CRF 24 and preset medium for good compression while maintaining quality
  const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -crf 24 -preset medium -c:a copy -movflags +faststart -y "${outputPath}"`;
  
  try {
    await execPromise(ffmpegCommand, { maxBuffer: 1024 * 1024 * 300 });
    
    const stats = fs.statSync(outputPath);
    const sizeMB = stats.size / 1024 / 1024;
    console.log(`  ✅ Compressed: ${sizeMB.toFixed(1)} MB`);
    
    if (sizeMB > 900) {
      console.log(`  ⚠️  Still over 900MB, trying higher compression...`);
      // Try again with higher CRF
      const ffmpegCommand2 = `ffmpeg -i "${inputPath}" -c:v libx264 -crf 26 -preset medium -c:a copy -movflags +faststart -y "${outputPath}"`;
      await execPromise(ffmpegCommand2, { maxBuffer: 1024 * 1024 * 300 });
      const stats2 = fs.statSync(outputPath);
      console.log(`  ✅ Re-compressed: ${(stats2.size / 1024 / 1024).toFixed(1)} MB`);
    }
    
    return outputPath;
  } catch (error) {
    console.error(`  ❌ FFmpeg error:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🗜️  Compressing Large Files for Mega.nz');
  console.log('========================================\n');
  
  // Find all files
  const filePaths = findAllMP4s(FOLDER_PATH);
  const files = filePaths.map(fp => ({ name: path.basename(fp), fullPath: fp }));
  
  const episodeFiles = {};
  
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    
    let match = fileName.match(/s(\d{2})e(\d{2})/i);
    if (match) {
      const season = parseInt(match[1]);
      const episode = parseInt(match[2]);
      
      let episodeNum = 0;
      if (season === 1) episodeNum = episode;
      else if (season === 2) episodeNum = 11 + episode;
      else if (season === 3) episodeNum = 21 + episode;
      else if (season === 4) episodeNum = 31 + episode;
      else if (season === 5) episodeNum = 41 + episode;
      else if (season === 6) episodeNum = 51 + episode;
      else if (season === 7) episodeNum = 61 + episode;
      else if (season === 8) episodeNum = 71 + episode;
      
      if (episodeNum > 0 && episodeNum <= 81) {
        episodeFiles[episodeNum] = file.fullPath;
      }
    }
  }
  
  console.log('🔍 Found episodes to compress:\n');
  
  for (const ep of LARGE_EPISODES) {
    const filePath = episodeFiles[ep.num];
    
    if (!filePath) {
      console.log(`❌ Episode ${ep.num} not found`);
      continue;
    }
    
    console.log(`📺 Episode ${ep.num} (S0${ep.season}E${String(ep.episode).padStart(2, '0')})`);
    const originalStats = fs.statSync(filePath);
    console.log(`  📦 Original size: ${(originalStats.size / 1024 / 1024).toFixed(1)} MB`);
    
    const outputPath = filePath.replace('.mp4', '_compressed.mp4');
    
    try {
      await compressFile(filePath, outputPath);
      
      // Replace original with compressed
      fs.unlinkSync(filePath);
      fs.renameSync(outputPath, filePath);
      
      console.log(`  ✅ Replaced original with compressed version\n`);
    } catch (error) {
      console.log(`  ❌ Failed to compress\n`);
    }
  }
  
  console.log('🎉 Compression complete!');
  console.log('✅ Ready to resume upload\n');
}

exec('ffmpeg -version', (error) => {
  if (error) {
    console.error('❌ FFmpeg not found!');
    process.exit(1);
  }
  
  main().catch(console.error);
});
