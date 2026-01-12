const fs = require('fs');
const path = require('path');

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

const filePaths = findAllMP4s(FOLDER_PATH);
const files = filePaths.map(fp => ({ name: path.basename(fp), fullPath: fp }));

console.log('📂 Files detected:\n');

const matches = [];

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
      const seasonEp = episodeMap[episodeNum];
      console.log(`${seasonEp || 'UNDEFINED'} → episode-${episodeNum}.mp4 (${file.name})`);
      matches.push({ episodeNum, file: file.name });
    } else {
      console.log(`⚠️  SKIPPED: ${file.name} (calculated episode ${episodeNum})`);
    }
  } else {
    console.log(`⚠️  SKIPPED: ${file.name} (no S##E## found)`);
  }
}

console.log(`\n✅ Total matched: ${matches.length}/81 episodes`);

// Check for missing episodes (1-60 only, the ones we need to fix)
const detectedNums = matches.map(m => m.episodeNum);
const missing = [];
for (let i = 1; i <= 60; i++) {
  if (!detectedNums.includes(i)) {
    missing.push(i);
  }
}

if (missing.length > 0) {
  console.log(`\n⚠️  Missing episodes (1-60):`);
  missing.forEach(num => {
    console.log(`   Episode ${num} (${episodeMap[num]})`);
  });
}
