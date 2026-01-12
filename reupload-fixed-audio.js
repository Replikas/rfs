const { Storage } = require('megajs');
const fs = require('fs');
const path = require('path');

const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// Episodes that were fixed (need re-upload)
const FIXED_EPISODES = [33, 34, 35, 36, 37, 38, 39, 40, 41, 48, 49, 51, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];

const ACCOUNTS = [
  {
    email: 'bbbreplika@gmail.com',
    password: 'Hotantenoci87.',
    episodes: FIXED_EPISODES.filter(ep => ep <= 40), // 1-40
  },
  {
    email: 'yoisan829@gmail.com',
    password: 'Hotantenoci87.',
    episodes: FIXED_EPISODES.filter(ep => ep > 40), // 41-81
  },
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

async function loginToMega(email, password) {
  const storage = new Storage({ email, password });
  
  return new Promise((resolve, reject) => {
    storage.once('ready', () => {
      console.log(`   ✅ Logged in to ${email}\n`);
      resolve(storage);
    });
    
    storage.once('error', (error) => {
      reject(new Error(`Login failed for ${email}: ${error.message}`));
    });
  });
}

async function deleteOldFile(storage, episodeNum) {
  const files = storage.root.children;
  const oldFile = files.find(f => f.name && f.name.startsWith(`Episode ${episodeNum} `));
  
  if (oldFile) {
    await new Promise((resolve, reject) => {
      oldFile.delete((error) => {
        if (error) reject(error);
        else {
          console.log(`   🗑️  Deleted old version`);
          resolve();
        }
      });
    });
  }
}

async function uploadFile(storage, filePath, episodeNum) {
  const fileName = path.basename(filePath);
  const fileSize = fs.statSync(filePath).size;
  
  console.log(`   📤 Uploading ${fileName}`);
  console.log(`   📦 Size: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
  
  return new Promise((resolve, reject) => {
    const uploadStream = storage.upload({
      name: `Episode ${episodeNum} - ${fileName}`,
      size: fileSize
    });
    
    fs.createReadStream(filePath).pipe(uploadStream);
    
    let lastProgress = 0;
    uploadStream.on('progress', (progress) => {
      const percent = Math.floor((progress.bytesLoaded / progress.bytesTotal) * 100);
      if (percent >= lastProgress + 10) {
        console.log(`   ⏳ ${percent}%`);
        lastProgress = percent;
      }
    });
    
    uploadStream.on('complete', (file) => {
      console.log(`   ✅ Upload complete!`);
      resolve(file);
    });
    
    uploadStream.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log('📤 Re-uploading Fixed Episodes to Mega.nz');
  console.log('==========================================\n');
  console.log(`Re-uploading ${FIXED_EPISODES.length} episodes with AAC audio\n`);
  
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
  
  for (const account of ACCOUNTS) {
    if (account.episodes.length === 0) continue;
    
    console.log(`\n🔐 Account: ${account.email}`);
    console.log(`   Episodes to upload: ${account.episodes.join(', ')}\n`);
    
    const storage = await loginToMega(account.email, account.password);
    
    for (const episodeNum of account.episodes) {
      if (!episodeFiles[episodeNum]) {
        console.log(`⚠️  Episode ${episodeNum}: File not found\n`);
        failCount++;
        continue;
      }
      
      const filePath = episodeFiles[episodeNum];
      
      console.log(`📺 Episode ${episodeNum}`);
      
      try {
        // Delete old version first
        await deleteOldFile(storage, episodeNum);
        
        // Upload new version
        await uploadFile(storage, filePath, episodeNum);
        
        successCount++;
        console.log('');
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
        failCount++;
      }
    }
  }
  
  console.log('\n🎉 RE-UPLOAD COMPLETE!');
  console.log('======================');
  console.log(`✅ Successful: ${successCount}/${FIXED_EPISODES.length}`);
  console.log(`❌ Failed: ${failCount}/${FIXED_EPISODES.length}\n`);
  
  if (successCount > 0) {
    console.log('🚀 Next step: Deploy updated site');
    console.log('   All audio should now work on all episodes!\n');
  }
}

main().catch(console.error);
