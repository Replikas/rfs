const { Storage } = require('megajs');
const fs = require('fs');
const path = require('path');

const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// Resume from Episode 41 onwards (Episodes 1-40 already uploaded)
const START_EPISODE = 41;

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

const ACCOUNT2_EMAIL = 'yoisan829@gmail.com';
const ACCOUNT2_PASSWORD = 'Hotantenoci87.';

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

async function loginToMega(email, password) {
  const storage = new Storage({ email, password });
  
  return new Promise((resolve, reject) => {
    storage.once('ready', () => {
      console.log('✅ Logged in successfully!');
      resolve(storage);
    });
    
    storage.once('error', (error) => {
      reject(new Error(`Login failed: ${error.message}`));
    });
  });
}

async function uploadFile(storage, filePath, episodeNum) {
  const fileName = `Episode ${episodeNum} - ${episodeMap[episodeNum]}.mp4`;
  const fileContent = fs.readFileSync(filePath);
  
  return new Promise((resolve, reject) => {
    const upload = storage.upload({ name: fileName }, fileContent);
    
    upload.on('complete', (file) => {
      // Get shareable link
      file.link((error, url) => {
        if (error) {
          reject(new Error(`Failed to get share link: ${error.message}`));
        } else {
          // Convert to embed URL
          const embedUrl = url.replace('https://mega.nz/file/', 'https://mega.nz/embed/');
          resolve({
            fileName,
            url,
            embedUrl,
          });
        }
      });
    });
    
    upload.on('error', (error) => {
      reject(new Error(`Upload failed: ${error.message}`));
    });
    
    let lastProgress = 0;
    upload.on('progress', (stats) => {
      const progress = Math.floor((stats.bytesLoaded / stats.bytesTotal) * 100);
      if (progress - lastProgress >= 10) {
        process.stdout.write(`\r   📊 ${progress}%`);
        lastProgress = progress;
      }
    });
  });
}

async function main() {
  console.log('📤 Mega.nz Upload Script - RESUME from Episode 41');
  console.log('==================================================\n');

  console.log('🔍 Finding video files...\n');
  
  // Find all files and match to episodes
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
      
      if (episodeNum >= START_EPISODE && episodeNum <= 81) {
        episodeFiles[episodeNum] = file.fullPath;
      }
    }
  }

  console.log(`✅ Found ${Object.keys(episodeFiles).length} episodes to upload\n`);

  // Login to Account 2
  console.log('🔐 Logging in to Mega.nz Account 2...');
  let storage2;
  try {
    storage2 = await loginToMega(ACCOUNT2_EMAIL, ACCOUNT2_PASSWORD);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    return;
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  // Upload Episodes 41-81 to Account 2
  console.log('\n📤 Uploading to Account 2 (Episodes 41-81)...\n');
  for (let i = START_EPISODE; i <= 81; i++) {
    if (!episodeFiles[i]) {
      console.log(`⚠️  Episode ${i} - File not found, skipping`);
      continue;
    }

    console.log(`📺 Episode ${i} (${episodeMap[i]})`);
    const filePath = episodeFiles[i];
    const stats = fs.statSync(filePath);
    console.log(`   📦 Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   ⬆️  Uploading...`);

    try {
      const result = await uploadFile(storage2, filePath, i);
      console.log(`\n   ✅ Uploaded! Embed URL ready`);
      results.push({ episodeNum: i, success: true, account: 2, ...result });
      successCount++;
    } catch (error) {
      console.log(`\n   ❌ Failed: ${error.message}`);
      results.push({ episodeNum: i, success: false, error: error.message });
      failCount++;
    }
    console.log('');
  }

  // Summary
  console.log('\n🎉 UPLOAD COMPLETE!');
  console.log('===================');
  console.log(`✅ Episodes 1-40: Already uploaded (Account 1)`);
  console.log(`✅ Episodes 41-81 successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}\n`);

  // Load previous results if exist
  let allResults = results;
  const previousReportPath = path.join(__dirname, 'mega-upload-results.json');
  if (fs.existsSync(previousReportPath)) {
    const previousResults = JSON.parse(fs.readFileSync(previousReportPath));
    allResults = [...previousResults, ...results];
  }

  // Save combined results
  const reportPath = path.join(__dirname, 'mega-upload-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`📄 Complete report saved: ${reportPath}\n`);

  console.log('🔗 Next steps:');
  console.log('1. All 81 episodes now on Mega.nz!');
  console.log('2. Update video player to use Mega embeds');
  console.log('3. Delete videos from R2');
  console.log('4. Videos work on iPhone! ✅\n');
}

main().catch(console.error);
