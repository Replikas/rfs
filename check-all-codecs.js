const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

const episodeMap = {
  1: 'S01E01', 2: 'S01E02', 3: 'S01E03', 4: 'S01E04', 5: 'S01E05',
  6: 'S01E06', 7: 'S01E07', 8: 'S01E08', 9: 'S01E09', 10: 'S01E10', 11: 'S01E11',
  12: 'S02E01', 13: 'S02E02', 14: 'S02E03', 15: 'S02E04', 16: 'S02E05',
  17: 'S02E06', 18: 'S02E07', 19: 'S02E08', 20: 'S02E09', 21: 'S02E10',
  22: 'S03E01', 23: 'S03E02', 24: 'S03E03', 25: 'S03E04', 26: 'S03E05',
  27: 'S03E06', 28: 'S03E07', 29: 'S03E08', 30: 'S03E09', 31: 'S03E10',
  32: 'S04E01', 33: 'S04E02', 34: 'S04E03', 35: 'S04E04', 36: 'S04E05',
  37: 'S04E06', 38: 'S04E07', 39: 'S04E08', 40: 'S04E09', 41: 'S04E10',
  42: 'S05E01', 43: 'S05E02', 44: 'S05E03', 45: 'S05E04', 46: 'S05E05',
  47: 'S05E06', 48: 'S05E07', 49: 'S05E08', 50: 'S05E09', 51: 'S05E10',
  52: 'S06E01', 53: 'S06E02', 54: 'S06E03', 55: 'S06E04', 56: 'S06E05',
  57: 'S06E06', 58: 'S06E07', 59: 'S06E08', 60: 'S06E09', 61: 'S06E10',
  62: 'S07E01', 63: 'S07E02', 64: 'S07E03', 65: 'S07E04', 66: 'S07E05',
  67: 'S07E06', 68: 'S07E07', 69: 'S07E08', 70: 'S07E09', 71: 'S07E10',
  72: 'S08E01', 73: 'S08E02', 74: 'S08E03', 75: 'S08E04', 76: 'S08E05',
  77: 'S08E06', 78: 'S08E07', 79: 'S08E08', 80: 'S08E09', 81: 'S08E10',
};

async function checkCodec(filePath, episodeNum) {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries stream=codec_name,codec_type,profile,width,height -of json "${filePath}"`,
      { timeout: 10000 }
    );
    
    const info = JSON.parse(stdout);
    
    if (!info.streams || info.streams.length === 0) {
      return { episodeNum, error: 'No streams found' };
    }
    
    const videoStream = info.streams.find(s => s.codec_type === 'video');
    const audioStream = info.streams.find(s => s.codec_type === 'audio');
    
    const videoCodec = videoStream?.codec_name || 'unknown';
    const videoProfile = videoStream?.profile || '';
    const resolution = videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown';
    const audioCodec = audioStream?.codec_name || 'unknown';
    
    // Determine browser compatibility
    let browserCompat = {
      chrome: true,
      firefox: true,
      safari: true,
      edge: true,
      android: true,
      iOS: false // we know none work on iOS
    };
    
    if (videoCodec === 'hevc') {
      // HEVC not supported in most browsers
      browserCompat.chrome = false;
      browserCompat.firefox = false;
      browserCompat.edge = false; // Windows Edge doesn't support HEVC
      browserCompat.android = false; // Most Android browsers don't support HEVC
      browserCompat.safari = true; // Only Safari supports HEVC
    }
    
    return {
      episodeNum,
      videoCodec,
      videoProfile,
      audioCodec,
      resolution,
      browserCompat
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

async function checkAllEpisodes() {
  console.log('🔍 RickFlix Browser Compatibility Checker');
  console.log('=========================================\n');
  console.log(`📂 Scanning: ${FOLDER_PATH}\n`);
  
  const filePaths = findAllMP4s(FOLDER_PATH);
  const files = filePaths.map(fp => ({ name: path.basename(fp), fullPath: fp }));
  
  console.log(`📂 Found ${files.length} MP4 files\n`);
  console.log('🔍 Analyzing codecs...\n');
  
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
  
  matches.sort((a, b) => a.episodeNum - b.episodeNum);
  
  const results = [];
  let checkedCount = 0;
  
  for (const match of matches) {
    checkedCount++;
    process.stdout.write(`\r⏳ Checking ${checkedCount}/${matches.length}...`);
    
    const result = await checkCodec(match.fullPath, match.episodeNum);
    results.push(result);
  }
  
  console.log('\n\n');
  
  // Categorize by codec
  const hevcEpisodes = results.filter(r => r.videoCodec === 'hevc');
  const h264Episodes = results.filter(r => r.videoCodec === 'h264');
  const otherEpisodes = results.filter(r => r.videoCodec && r.videoCodec !== 'hevc' && r.videoCodec !== 'h264');
  const errorEpisodes = results.filter(r => r.error);
  
  console.log('📊 CODEC ANALYSIS');
  console.log('=================\n');
  
  console.log(`✅ H.264 (Universal): ${h264Episodes.length} episodes`);
  console.log(`⚠️  HEVC (Limited): ${hevcEpisodes.length} episodes`);
  if (otherEpisodes.length > 0) {
    console.log(`❓ Other: ${otherEpisodes.length} episodes`);
  }
  if (errorEpisodes.length > 0) {
    console.log(`❌ Errors: ${errorEpisodes.length} episodes`);
  }
  console.log('');
  
  if (hevcEpisodes.length > 0) {
    console.log('⚠️  HEVC EPISODES (Limited Browser Support):');
    console.log('=============================================');
    console.log('These will ONLY work on Safari. Chrome/Firefox/Edge will show audio only.\n');
    
    // Group by season
    const bySeason = {};
    hevcEpisodes.forEach(ep => {
      const season = Math.ceil(ep.episodeNum / 10);
      if (!bySeason[season]) bySeason[season] = [];
      bySeason[season].push(ep.episodeNum);
    });
    
    Object.keys(bySeason).sort().forEach(season => {
      const eps = bySeason[season];
      console.log(`  Season ${season}: Episodes ${eps.join(', ')}`);
    });
    console.log('');
  }
  
  if (h264Episodes.length > 0) {
    console.log('✅ H.264 EPISODES (Universal Support):');
    console.log('======================================');
    console.log('These work on Chrome, Firefox, Edge, Safari, and Android.\n');
    
    // Group by season
    const bySeason = {};
    h264Episodes.forEach(ep => {
      const season = Math.ceil(ep.episodeNum / 10);
      if (!bySeason[season]) bySeason[season] = [];
      bySeason[season].push(ep.episodeNum);
    });
    
    Object.keys(bySeason).sort().forEach(season => {
      const eps = bySeason[season];
      console.log(`  Season ${season}: Episodes ${eps.join(', ')}`);
    });
    console.log('');
  }
  
  // Browser compatibility summary
  console.log('🌐 BROWSER COMPATIBILITY SUMMARY');
  console.log('=================================\n');
  
  const chromeWorks = results.filter(r => r.browserCompat?.chrome).length;
  const safariWorks = results.filter(r => r.browserCompat?.safari).length;
  const androidWorks = results.filter(r => r.browserCompat?.android).length;
  
  console.log(`Chrome/Edge:  ${chromeWorks}/81 episodes work ✅`);
  console.log(`Firefox:      ${chromeWorks}/81 episodes work ✅`);
  console.log(`Safari:       ${safariWorks}/81 episodes work ✅`);
  console.log(`Android:      ${androidWorks}/81 episodes work ✅`);
  console.log(`iPhone:       0/81 episodes work ❌ (codec issue)\n`);
  
  if (hevcEpisodes.length > 0) {
    console.log('🔧 RECOMMENDED FIX:');
    console.log('===================');
    console.log(`Convert ${hevcEpisodes.length} HEVC episodes to H.264 for universal compatibility.`);
    console.log('Run: node fix-season3.js (or similar for other seasons)\n');
  }
  
  // Save detailed report
  const reportPath = path.join(__dirname, 'codec-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved: ${reportPath}\n`);
}

// Check for ffprobe
exec('ffprobe -version', (error) => {
  if (error) {
    console.error('❌ ffprobe not found!');
    process.exit(1);
  }
  
  checkAllEpisodes().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
});
