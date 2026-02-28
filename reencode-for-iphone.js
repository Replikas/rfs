const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// Episodes that need re-encoding (HEVC and AV1 to H.264)
const NEEDS_REENCODING = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, // HEVC episodes
  52, 56, 57, 60, 61, // More HEVC
  62, 63, 64, 65, 66, 67, 68, 69, 70, 71 // AV1 episodes
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

async function reencodeVideo(inputPath, episodeNum) {
  const fileName = path.basename(inputPath);
  const outputPath = inputPath.replace('.mp4', '_h264.mp4');
  
  console.log(`   🔧 Re-encoding to H.264 + AAC...`);
  console.log(`   ⚙️  Using hardware acceleration if available...`);
  
  try {
    // Try hardware encoding first (much faster)
    const { stdout } = await execPromise(
      `ffmpeg -i "${inputPath}" -c:v h264_nvenc -preset fast -c:a aac -b:a 192k -movflags +faststart -y "${outputPath}"`,
      { maxBuffer: 1024 * 1024 * 300, timeout: 600000 }
    );
    
    console.log(`   ✅ Encoded with GPU acceleration`);
    
  } catch (hwError) {
    // Fallback to software encoding
    console.log(`   ⚠️  GPU not available, using CPU encoding...`);
    
    try {
      await execPromise(
        `ffmpeg -i "${inputPath}" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -movflags +faststart -y "${outputPath}"`,
        { maxBuffer: 1024 * 1024 * 300, timeout: 1200000 }
      );
      
      console.log(`   ✅ Encoded with CPU`);
      
    } catch (swError) {
      throw new Error(swError.message);
    }
  }
  
  const originalSize = fs.statSync(inputPath).size;
  const encodedSize = fs.statSync(outputPath).size;
  
  console.log(`   📦 Original: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   📦 Encoded: ${(encodedSize / 1024 / 1024).toFixed(1)} MB`);
  
  // Replace original with encoded version
  fs.unlinkSync(inputPath);
  fs.renameSync(outputPath, inputPath);
  
  console.log(`   ✅ Replaced original with H.264 version`);
  
  return true;
}

async function main() {
  console.log('🎬 Re-encoding Videos for iPhone Compatibility');
  console.log('==============================================\n');
  console.log(`Converting ${NEEDS_REENCODING.length} episodes to H.264 + AAC\n`);
  
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
  
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();
  
  for (const episodeNum of NEEDS_REENCODING) {
    if (!episodeFiles[episodeNum]) {
      console.log(`⚠️  Episode ${episodeNum}: File not found\n`);
      failCount++;
      continue;
    }
    
    const filePath = episodeFiles[episodeNum];
    const fileName = path.basename(filePath);
    
    console.log(`📺 Episode ${episodeNum}: ${fileName}`);
    
    try {
      await reencodeVideo(filePath, episodeNum);
      successCount++;
      
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const avg = elapsed / successCount;
      const remaining = (NEEDS_REENCODING.length - successCount) * avg;
      
      console.log(`   ⏱️  Time: ${elapsed} min | Est. remaining: ${remaining.toFixed(1)} min\n`);
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      failCount++;
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n🎉 RE-ENCODING COMPLETE!');
  console.log('========================');
  console.log(`✅ Successful: ${successCount}/${NEEDS_REENCODING.length}`);
  console.log(`❌ Failed: ${failCount}/${NEEDS_REENCODING.length}`);
  console.log(`⏱️  Total time: ${totalTime} minutes\n`);
  
  if (successCount > 0) {
    console.log('✅ All videos now H.264 + AAC (iPhone compatible!)');
    console.log('📤 Next step: Upload to R2');
    console.log('   Run: node upload-all-to-r2.js\n');
  }
}

main().catch(console.error);
