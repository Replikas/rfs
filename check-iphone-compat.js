const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

async function checkiPhoneCompat(filePath, episodeNum) {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries stream=codec_name,codec_type,profile,level,width,height,pix_fmt,bit_rate -show_entries format=bit_rate -of json "${filePath}"`,
      { timeout: 10000 }
    );
    
    const info = JSON.parse(stdout);
    
    if (!info.streams || info.streams.length === 0) {
      return { episodeNum, error: 'No streams found' };
    }
    
    const videoStream = info.streams.find(s => s.codec_type === 'video');
    const audioStream = info.streams.find(s => s.codec_type === 'audio');
    
    if (!videoStream) {
      return { episodeNum, error: 'No video stream' };
    }
    
    const videoCodec = videoStream.codec_name;
    const videoProfile = videoStream.profile;
    const videoLevel = videoStream.level;
    const width = videoStream.width;
    const height = videoStream.height;
    const pixFmt = videoStream.pix_fmt;
    const videoBitrate = parseInt(videoStream.bit_rate) || 0;
    const formatBitrate = parseInt(info.format.bit_rate) || 0;
    const audioCodec = audioStream?.codec_name || 'unknown';
    
    // iPhone compatibility checks
    let compatible = true;
    let issues = [];
    
    // 1. Must be H.264
    if (videoCodec !== 'h264') {
      compatible = false;
      issues.push(`Wrong codec: ${videoCodec} (needs h264)`);
    }
    
    // 2. Must be Baseline Profile
    if (videoProfile && !videoProfile.toLowerCase().includes('baseline')) {
      compatible = false;
      issues.push(`Wrong profile: ${videoProfile} (needs Baseline)`);
    }
    
    // 3. Level should be 3.0 or lower (30 in ffprobe output)
    if (videoLevel && videoLevel > 31) {
      compatible = false;
      issues.push(`Level too high: ${videoLevel / 10} (needs ≤3.1)`);
    }
    
    // 4. Resolution should be <= 1280x720
    if (width > 1280 || height > 720) {
      compatible = false;
      issues.push(`Resolution too high: ${width}x${height} (needs ≤1280x720)`);
    }
    
    // 5. Pixel format should be yuv420p
    if (pixFmt && pixFmt !== 'yuv420p') {
      compatible = false;
      issues.push(`Wrong pixel format: ${pixFmt} (needs yuv420p)`);
    }
    
    // 6. Audio should be AAC
    if (audioCodec !== 'aac') {
      compatible = false;
      issues.push(`Wrong audio: ${audioCodec} (needs aac)`);
    }
    
    // 7. Bitrate check (warning, not blocker)
    const bitrate = videoBitrate || formatBitrate;
    if (bitrate > 3000000) {
      issues.push(`High bitrate: ${(bitrate / 1000000).toFixed(1)} Mbps (iPhone prefers <2.5 Mbps)`);
    }
    
    return {
      episodeNum,
      compatible,
      issues,
      details: {
        codec: videoCodec,
        profile: videoProfile,
        level: videoLevel ? (videoLevel / 10).toFixed(1) : 'unknown',
        resolution: `${width}x${height}`,
        pixFmt,
        audioCodec,
        bitrate: bitrate ? `${(bitrate / 1000000).toFixed(1)} Mbps` : 'unknown'
      }
    };
    
  } catch (error) {
    return { episodeNum, error: error.message };
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

async function checkAllForIphone() {
  console.log('📱 iPhone Compatibility Checker');
  console.log('================================\n');
  console.log(`📂 Scanning: ${FOLDER_PATH}\n`);
  
  const filePaths = findAllMP4s(FOLDER_PATH);
  const files = filePaths.map(fp => ({ name: path.basename(fp), fullPath: fp }));
  
  console.log(`📂 Found ${files.length} MP4 files\n`);
  console.log('🔍 Analyzing iPhone compatibility...\n');
  
  const matches = [];
  
  // Match files to episodes
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
        matches.push({
          episodeNum,
          fullPath: file.fullPath
        });
      }
    }
  }
  
  matches.sort((a, b) => a.episodeNum - b.episodeNum);
  
  const results = [];
  let checkedCount = 0;
  
  for (const match of matches) {
    checkedCount++;
    process.stdout.write(`\r⏳ Checking ${checkedCount}/${matches.length}...`);
    
    const result = await checkiPhoneCompat(match.fullPath, match.episodeNum);
    results.push(result);
  }
  
  console.log('\n\n');
  
  const compatible = results.filter(r => r.compatible);
  const incompatible = results.filter(r => !r.compatible && !r.error);
  const errors = results.filter(r => r.error);
  
  console.log('📊 IPHONE COMPATIBILITY RESULTS');
  console.log('================================\n');
  console.log(`✅ iPhone Compatible: ${compatible.length}/81`);
  console.log(`❌ iPhone Incompatible: ${incompatible.length}/81`);
  if (errors.length > 0) {
    console.log(`⚠️  Errors: ${errors.length}/81`);
  }
  console.log('');
  
  if (compatible.length > 0) {
    console.log('✅ COMPATIBLE EPISODES:');
    console.log('========================');
    console.log(`These ${compatible.length} episodes should work on iPhone!\n`);
    
    // Show first 5 as examples
    compatible.slice(0, 5).forEach(r => {
      console.log(`Episode ${r.episodeNum}: ${r.details.resolution}, ${r.details.profile}, ${r.details.bitrate}`);
    });
    if (compatible.length > 5) {
      console.log(`... and ${compatible.length - 5} more\n`);
    }
  }
  
  if (incompatible.length > 0) {
    console.log('\n❌ INCOMPATIBLE EPISODES:');
    console.log('==========================');
    console.log('These episodes WILL NOT work on iPhone:\n');
    
    // Group by common issues
    const issueGroups = {};
    incompatible.forEach(r => {
      const key = r.issues[0] || 'Unknown issue';
      if (!issueGroups[key]) issueGroups[key] = [];
      issueGroups[key].push(r.episodeNum);
    });
    
    Object.entries(issueGroups).forEach(([issue, episodes]) => {
      console.log(`\n📍 ${issue}`);
      console.log(`   Episodes: ${episodes.slice(0, 10).join(', ')}${episodes.length > 10 ? '...' : ''}`);
      console.log(`   Count: ${episodes.length}`);
    });
    
    console.log('\n');
    
    // Show details for first few
    console.log('📋 Sample incompatible episodes:\n');
    incompatible.slice(0, 3).forEach(r => {
      console.log(`Episode ${r.episodeNum}:`);
      console.log(`  Details: ${r.details.resolution}, ${r.details.profile}, Level ${r.details.level}`);
      console.log(`  Issues:`);
      r.issues.forEach(issue => console.log(`    - ${issue}`));
      console.log('');
    });
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('===================\n');
  
  if (compatible.length === 81) {
    console.log('🎉 All videos are iPhone compatible!');
    console.log('Your site should work on iPhone Safari now!\n');
  } else if (compatible.length > 40) {
    console.log(`${incompatible.length} episodes need iPhone-compatible encoding.`);
    console.log('These likely use High Profile or are 1080p.\n');
    console.log('Run conversion script to fix them.\n');
  } else if (compatible.length === 0) {
    console.log('None of your videos are iPhone compatible.');
    console.log('All 81 episodes need to be re-encoded with iPhone-strict settings:\n');
    console.log('  - H.264 Baseline Profile, Level 3.1');
    console.log('  - 720p resolution (1280x720 max)');
    console.log('  - YUV 4:2:0 pixel format');
    console.log('  - AAC audio\n');
  } else {
    console.log(`${incompatible.length} episodes need iPhone conversion.`);
    console.log('I can create a script to convert only those episodes.\n');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'iphone-compat-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved: ${reportPath}\n`);
}

exec('ffprobe -version', (error) => {
  if (error) {
    console.error('❌ ffprobe not found!');
    process.exit(1);
  }
  
  checkAllForIphone().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
});
