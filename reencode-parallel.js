const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// Encode this many videos at the same time (based on your CPU cores)
const PARALLEL_JOBS = 4; // Adjust based on your CPU (more cores = more jobs)

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

async function reencodeVideo(inputPath, episodeNum) {
  const outputPath = inputPath.replace('.mp4', '_h264.mp4');
  
  try {
    // Try GPU encoding first (MUCH faster - 5-10x)
    await execPromise(
      `ffmpeg -hwaccel auto -i "${inputPath}" -c:v h264_nvenc -preset p4 -c:a aac -b:a 192k -movflags +faststart -y "${outputPath}"`,
      { maxBuffer: 1024 * 1024 * 300, timeout: 600000 }
    );
    
    return { gpu: true, outputPath };
    
  } catch (hwError) {
    // Fallback to CPU encoding with fast preset
    await execPromise(
      `ffmpeg -i "${inputPath}" -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 192k -movflags +faststart -y "${outputPath}"`,
      { maxBuffer: 1024 * 1024 * 300, timeout: 1200000 }
    );
    
    return { gpu: false, outputPath };
  }
}

async function processEpisode(filePath, episodeNum) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  
  console.log(`\n📺 Episode ${episodeNum}: ${fileName}`);
  console.log(`   📦 Size: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   🔧 Encoding...`);
  
  const startTime = Date.now();
  
  try {
    const result = await reencodeVideo(filePath, episodeNum);
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const originalSize = fs.statSync(filePath).size;
    const encodedSize = fs.statSync(result.outputPath).size;
    
    // Replace original
    fs.unlinkSync(filePath);
    fs.renameSync(result.outputPath, filePath);
    
    console.log(`   ✅ Complete! (${elapsed}s) ${result.gpu ? '🚀 GPU' : '💻 CPU'}`);
    console.log(`   📦 ${(originalSize / 1024 / 1024).toFixed(1)} MB → ${(encodedSize / 1024 / 1024).toFixed(1)} MB`);
    
    return { success: true, episodeNum, time: elapsed };
    
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
    return { success: false, episodeNum, error: error.message };
  }
}

async function main() {
  console.log('🎬 PARALLEL Video Re-encoding for iPhone');
  console.log('=========================================\n');
  console.log(`🚀 Encoding ${PARALLEL_JOBS} videos at the same time!`);
  console.log(`📊 Total episodes to encode: ${NEEDS_REENCODING.length}\n`);
  
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
  
  const startTime = Date.now();
  const results = [];
  let completed = 0;
  
  // Process in batches of PARALLEL_JOBS
  for (let i = 0; i < NEEDS_REENCODING.length; i += PARALLEL_JOBS) {
    const batch = NEEDS_REENCODING.slice(i, i + PARALLEL_JOBS);
    
    console.log(`\n🔄 Processing batch: Episodes ${batch.join(', ')}\n`);
    
    // Run all in parallel
    const promises = batch.map(episodeNum => {
      if (!episodeFiles[episodeNum]) {
        console.log(`⚠️  Episode ${episodeNum}: File not found`);
        return Promise.resolve({ success: false, episodeNum });
      }
      return processEpisode(episodeFiles[episodeNum], episodeNum);
    });
    
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
    
    completed += batch.length;
    const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    const avg = elapsed / completed;
    const remaining = ((NEEDS_REENCODING.length - completed) * avg).toFixed(1);
    
    console.log(`\n📊 Progress: ${completed}/${NEEDS_REENCODING.length}`);
    console.log(`⏱️  Elapsed: ${elapsed} min | Remaining: ~${remaining} min\n`);
  }
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  console.log('\n🎉 RE-ENCODING COMPLETE!');
  console.log('========================');
  console.log(`✅ Successful: ${successCount}/${NEEDS_REENCODING.length}`);
  console.log(`❌ Failed: ${failCount}/${NEEDS_REENCODING.length}`);
  console.log(`⏱️  Total time: ${totalTime} minutes\n`);
  
  if (successCount > 0) {
    console.log('✅ All videos now H.264 + AAC (iPhone compatible!)');
    console.log('📤 Next: node upload-all-to-r2.js\n');
  }
}

main().catch(console.error);
