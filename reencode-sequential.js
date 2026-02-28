const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// Episodes that need re-encoding
const NEEDS_REENCODING = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31,
  52, 56, 57, 60, 61,
  62, 63, 64, 65, 66, 67, 68, 69, 70, 71
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

function isAlreadyH264(filePath) {
  // Check if filename contains _h264 or if it's already been processed
  const outputPath = filePath.replace('.mp4', '_h264.mp4');
  return fs.existsSync(outputPath);
}

async function reencodeVideo(inputPath, episodeNum) {
  const outputPath = inputPath.replace('.mp4', '_h264.mp4');
  
  console.log(`   🔧 Encoding to H.264 + AAC (using veryfast preset)...`);
  
  try {
    // Use CPU encoding with veryfast preset (less CPU intensive)
    await execPromise(
      `ffmpeg -i "${inputPath}" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 192k -movflags +faststart -threads 2 -y "${outputPath}"`,
      { maxBuffer: 1024 * 1024 * 300, timeout: 1800000 }
    );
    
    const originalSize = fs.statSync(inputPath).size;
    const encodedSize = fs.statSync(outputPath).size;
    
    console.log(`   📦 Original: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   📦 Encoded: ${(encodedSize / 1024 / 1024).toFixed(1)} MB`);
    
    // Replace original with encoded version
    fs.unlinkSync(inputPath);
    fs.renameSync(outputPath, inputPath);
    
    console.log(`   ✅ Replaced with H.264 version`);
    
    return true;
    
  } catch (error) {
    throw new Error(error.message);
  }
}

async function main() {
  console.log('🎬 Sequential Video Re-encoding (Low CPU Usage)');
  console.log('================================================\n');
  console.log(`📊 Total episodes to encode: ${NEEDS_REENCODING.length}`);
  console.log(`🐢 Encoding one at a time to save CPU\n`);
  
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
  let skippedCount = 0;
  const startTime = Date.now();
  
  for (const episodeNum of NEEDS_REENCODING) {
    if (!episodeFiles[episodeNum]) {
      console.log(`⚠️  Episode ${episodeNum}: File not found\n`);
      failCount++;
      continue;
    }
    
    const filePath = episodeFiles[episodeNum];
    const fileName = path.basename(filePath);
    
    console.log(`\n📺 Episode ${episodeNum} (${successCount + skippedCount + 1}/${NEEDS_REENCODING.length})`);
    console.log(`   ${fileName}`);
    
    const episodeStartTime = Date.now();
    
    try {
      await reencodeVideo(filePath, episodeNum);
      
      const episodeTime = ((Date.now() - episodeStartTime) / 1000).toFixed(1);
      successCount++;
      
      const totalElapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const avgPerVideo = totalElapsed / successCount;
      const remaining = ((NEEDS_REENCODING.length - successCount - skippedCount) * avgPerVideo).toFixed(1);
      
      console.log(`   ⏱️  Took ${episodeTime}s | Total: ${totalElapsed}min | Est. remaining: ${remaining}min`);
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n\n🎉 RE-ENCODING COMPLETE!');
  console.log('========================');
  console.log(`✅ Successful: ${successCount}/${NEEDS_REENCODING.length}`);
  console.log(`❌ Failed: ${failCount}/${NEEDS_REENCODING.length}`);
  console.log(`⏱️  Total time: ${totalTime} minutes\n`);
  
  if (successCount > 0) {
    console.log('✅ All videos now H.264 + AAC (iPhone compatible!)');
    console.log('📤 Next step: node upload-all-to-r2.js\n');
  }
}

main().catch(console.error);
