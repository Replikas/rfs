const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

async function checkVideo(filePath, episodeNum) {
  const fileName = path.basename(filePath);
  
  try {
    // Use ffprobe to check video integrity
    const { stdout, stderr } = await execPromise(
      `ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,codec_type -of json "${filePath}"`,
      { timeout: 30000 }
    );
    
    const info = JSON.parse(stdout);
    
    if (!info.format || !info.streams) {
      return { episodeNum, fileName, status: 'ERROR', error: 'Invalid file structure' };
    }
    
    const duration = parseFloat(info.format.duration);
    const hasVideo = info.streams.some(s => s.codec_type === 'video');
    const hasAudio = info.streams.some(s => s.codec_type === 'audio');
    
    if (!hasVideo) {
      return { episodeNum, fileName, status: 'ERROR', error: 'No video stream found' };
    }
    
    if (!hasAudio) {
      return { episodeNum, fileName, status: 'WARNING', error: 'No audio stream (silent video)' };
    }
    
    if (duration < 60) {
      return { episodeNum, fileName, status: 'WARNING', error: `Very short duration: ${duration.toFixed(1)}s` };
    }
    
    const videoCodec = info.streams.find(s => s.codec_type === 'video')?.codec_name;
    const audioCodec = info.streams.find(s => s.codec_type === 'audio')?.codec_name;
    
    return {
      episodeNum,
      fileName,
      status: 'OK',
      duration: Math.floor(duration / 60),
      videoCodec,
      audioCodec,
      size: (parseInt(info.format.size) / 1024 / 1024).toFixed(1)
    };
    
  } catch (error) {
    return {
      episodeNum,
      fileName,
      status: 'ERROR',
      error: error.message.includes('timeout') ? 'File check timeout' : 'Corrupted or unreadable'
    };
  }
}

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

async function verifyAll() {
  console.log('🔍 RickFlix Video Integrity Checker');
  console.log('====================================\n');
  console.log(`📂 Scanning: ${FOLDER_PATH}\n`);
  
  const filePaths = findAllMP4s(FOLDER_PATH);
  const files = filePaths.map(fp => ({ name: path.basename(fp), fullPath: fp }));
  
  console.log(`📂 Found ${files.length} MP4 files\n`);
  console.log('🔍 Checking video integrity (this may take a few minutes)...\n');
  
  const matches = [];
  
  // Match files to episodes
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    
    let match = fileName.match(/s(\d{2})e(\d{2})/i);
    if (!match) {
      match = fileName.match(/season\s*(\d+).*episode\s*(\d+)/i);
    }
    
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
        matches.push({
          episodeNum,
          fullPath: file.fullPath
        });
      }
    }
  }
  
  console.log(`✅ Matched ${matches.length} episodes\n`);
  
  const results = [];
  let checkedCount = 0;
  
  for (const match of matches) {
    checkedCount++;
    process.stdout.write(`\r⏳ Checking ${checkedCount}/${matches.length}...`);
    
    const result = await checkVideo(match.fullPath, match.episodeNum);
    results.push(result);
  }
  
  console.log('\n\n');
  
  // Sort by episode number
  results.sort((a, b) => a.episodeNum - b.episodeNum);
  
  const errors = results.filter(r => r.status === 'ERROR');
  const warnings = results.filter(r => r.status === 'WARNING');
  const ok = results.filter(r => r.status === 'OK');
  
  console.log('📊 VERIFICATION RESULTS');
  console.log('=======================\n');
  console.log(`✅ Good: ${ok.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Errors: ${errors.length}\n`);
  
  if (errors.length > 0) {
    console.log('❌ CORRUPTED/UNPLAYABLE FILES:');
    console.log('================================');
    errors.forEach(r => {
      console.log(`\nEpisode ${r.episodeNum}:`);
      console.log(`  File: ${r.fileName}`);
      console.log(`  Error: ${r.error}`);
    });
    console.log('\n');
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    console.log('=============');
    warnings.forEach(r => {
      console.log(`\nEpisode ${r.episodeNum}:`);
      console.log(`  File: ${r.fileName}`);
      console.log(`  Issue: ${r.error}`);
    });
    console.log('\n');
  }
  
  if (ok.length > 0) {
    console.log('✅ SAMPLE OF GOOD FILES:');
    console.log('========================');
    ok.slice(0, 5).forEach(r => {
      console.log(`Episode ${r.episodeNum}: ${r.duration}min, ${r.videoCodec}/${r.audioCodec}, ${r.size}MB`);
    });
    if (ok.length > 5) {
      console.log(`... and ${ok.length - 5} more good files`);
    }
    console.log('\n');
  }
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('🎉 ALL FILES ARE GOOD!');
    console.log('Ready to upload to R2.\n');
  } else if (errors.length === 0) {
    console.log('✅ No critical errors found.');
    console.log('Warnings can usually be ignored.\n');
  } else {
    console.log('⚠️  SOME FILES HAVE ERRORS!');
    console.log(`You should replace ${errors.length} corrupted file(s) before uploading.\n`);
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'video-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved: ${reportPath}\n`);
}

// Check for ffprobe
exec('ffprobe -version', (error) => {
  if (error) {
    console.error('❌ ffprobe not found! (Part of FFmpeg)');
    console.error('FFmpeg is already installed, but ffprobe might not be in PATH.');
    process.exit(1);
  }
  
  verifyAll().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
});
