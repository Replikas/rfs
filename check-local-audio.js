const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

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

async function checkAudio(filePath, episodeNum) {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,channels,sample_rate -of json "${filePath}"`,
      { timeout: 10000 }
    );
    
    const info = JSON.parse(stdout);
    
    if (!info.streams || info.streams.length === 0) {
      return { episodeNum, hasAudio: false };
    }
    
    const audioStream = info.streams[0];
    
    return {
      episodeNum,
      hasAudio: true,
      codec: audioStream.codec_name,
      channels: audioStream.channels,
      sampleRate: audioStream.sample_rate
    };
    
  } catch (error) {
    return { episodeNum, hasAudio: false, error: error.message };
  }
}

async function main() {
  console.log('🔊 Checking Audio on Local Video Files');
  console.log('========================================\n');
  
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
  
  console.log(`✅ Found ${Object.keys(episodeFiles).length} episodes\n`);
  
  const results = [];
  
  for (let i = 1; i <= 81; i++) {
    if (!episodeFiles[i]) {
      console.log(`⚠️  Episode ${i}: File not found`);
      continue;
    }
    
    const filePath = episodeFiles[i];
    const fileName = path.basename(filePath);
    
    console.log(`📺 Episode ${i}: ${fileName}`);
    
    const audioCheck = await checkAudio(filePath, i);
    
    if (audioCheck.hasAudio) {
      console.log(`   ✅ Audio: ${audioCheck.codec} (${audioCheck.channels} channels, ${audioCheck.sampleRate} Hz)`);
    } else {
      console.log(`   ❌ NO AUDIO`);
    }
    
    results.push(audioCheck);
  }
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('===========\n');
  
  const withAudio = results.filter(r => r.hasAudio).length;
  const withoutAudio = results.filter(r => !r.hasAudio).length;
  
  console.log(`✅ Videos with audio: ${withAudio}/81`);
  console.log(`❌ Videos without audio: ${withoutAudio}/81\n`);
  
  if (withoutAudio > 0) {
    console.log('⚠️  Episodes missing audio:');
    results.filter(r => !r.hasAudio).forEach(r => {
      console.log(`   - Episode ${r.episodeNum}`);
    });
    console.log('');
  }
  
  // Save report
  const reportPath = path.join(__dirname, 'local-audio-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: ${reportPath}\n`);
}

main().catch(console.error);
