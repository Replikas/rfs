const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// Browsers support these audio codecs:
// - AAC: ✅ All browsers
// - AC3/EAC3: ⚠️ Limited support
// - Opus: ⚠️ Limited support in MP4 container

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

async function checkAudio(filePath) {
  const { stdout } = await execPromise(
    `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of json "${filePath}"`,
    { timeout: 10000 }
  );
  
  const info = JSON.parse(stdout);
  return info.streams?.[0]?.codec_name || 'none';
}

async function convertAudio(inputPath, outputPath) {
  console.log(`  🔧 Converting to AAC audio...`);
  
  // Convert audio to AAC, keep video as-is
  await execPromise(
    `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -movflags +faststart -y "${outputPath}"`,
    { maxBuffer: 1024 * 1024 * 300 }
  );
}

async function main() {
  console.log('🔊 Fixing Audio Compatibility for All Episodes');
  console.log('===============================================\n');
  
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
  
  const needsConversion = [];
  
  console.log('🔍 Checking audio codecs...\n');
  
  for (let i = 1; i <= 81; i++) {
    if (!episodeFiles[i]) continue;
    
    const codec = await checkAudio(episodeFiles[i]);
    
    if (codec !== 'aac') {
      needsConversion.push({ episodeNum: i, path: episodeFiles[i], codec });
      console.log(`⚠️  Episode ${i}: ${codec} (needs conversion)`);
    }
  }
  
  console.log(`\n📊 Found ${needsConversion.length} episodes needing audio conversion\n`);
  
  if (needsConversion.length === 0) {
    console.log('✅ All episodes already have AAC audio!\n');
    return;
  }
  
  console.log('🔧 Converting episodes to AAC audio...\n');
  
  for (const episode of needsConversion) {
    console.log(`📺 Episode ${episode.episodeNum}`);
    const outputPath = episode.path.replace('.mp4', '_aac.mp4');
    
    try {
      await convertAudio(episode.path, outputPath);
      
      // Replace original with converted
      fs.unlinkSync(episode.path);
      fs.renameSync(outputPath, episode.path);
      
      console.log(`  ✅ Converted to AAC\n`);
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}\n`);
    }
  }
  
  console.log('🎉 Audio conversion complete!\n');
  console.log('Next step: Re-upload these episodes to Mega.nz\n');
}

main().catch(console.error);
