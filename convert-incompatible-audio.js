const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// Episodes that need audio conversion (AC3, EAC3, Opus)
const INCOMPATIBLE = [33, 34, 35, 36, 37, 38, 39, 40, 41, 48, 49, 51, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];

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

async function convertAudio(inputPath, outputPath, episodeNum) {
  console.log(`  🔧 Converting audio to AAC...`);
  
  try {
    // Convert audio to AAC, keep video as-is
    await execPromise(
      `ffmpeg -i "${inputPath}" -c:v copy -c:a aac -b:a 192k -movflags +faststart -y "${outputPath}"`,
      { maxBuffer: 1024 * 1024 * 300 }
    );
    
    const originalSize = fs.statSync(inputPath).size;
    const convertedSize = fs.statSync(outputPath).size;
    
    console.log(`  📦 Original: ${(originalSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`  📦 Converted: ${(convertedSize / 1024 / 1024).toFixed(1)} MB`);
    
    return true;
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🔊 Converting Incompatible Audio to AAC');
  console.log('========================================\n');
  console.log(`Converting ${INCOMPATIBLE.length} episodes with AC3/EAC3/Opus audio\n`);
  
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
  
  for (const episodeNum of INCOMPATIBLE) {
    if (!episodeFiles[episodeNum]) {
      console.log(`⚠️  Episode ${episodeNum}: File not found\n`);
      continue;
    }
    
    const inputPath = episodeFiles[episodeNum];
    const outputPath = inputPath.replace('.mp4', '_aac.mp4');
    
    console.log(`📺 Episode ${episodeNum}: ${path.basename(inputPath)}`);
    
    const success = await convertAudio(inputPath, outputPath, episodeNum);
    
    if (success) {
      // Replace original with converted
      fs.unlinkSync(inputPath);
      fs.renameSync(outputPath, inputPath);
      console.log(`  ✅ Replaced with AAC version\n`);
      successCount++;
    } else {
      // Clean up failed conversion
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      failCount++;
      console.log('');
    }
  }
  
  console.log('🎉 CONVERSION COMPLETE!');
  console.log('=======================');
  console.log(`✅ Successful: ${successCount}/${INCOMPATIBLE.length}`);
  console.log(`❌ Failed: ${failCount}/${INCOMPATIBLE.length}\n`);
  
  if (successCount > 0) {
    console.log('📤 Next step: Re-upload these episodes to Mega.nz');
    console.log('   Run: node upload-to-mega-resume.js\n');
  }
}

main().catch(console.error);
