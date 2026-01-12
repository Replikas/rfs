const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');
const path = require('path');

const R2_ACCOUNT_ID = 'a52c58eca06d45b7c1b7a7c26d825275';
const R2_ACCESS_KEY_ID = '19d36d2d0021015005cc9f3dc833b03b';
const R2_SECRET_ACCESS_KEY = '0f3fa4789f860ea3a0fb742131bc9677828e75cbfddb4ed9f3e7a588abbcdf24';
const R2_BUCKET_NAME = 'rem';

const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

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
  57: 'S06E06', 58: 'S06E07', 59: 'S06E08', 60: 'S06E09',
};

async function uploadFile(localPath, episodeNum) {
  const fileName = path.basename(localPath);
  const fileSize = fs.statSync(localPath).size;
  const seasonEp = episodeMap[episodeNum];
  
  console.log(`\n📺 Episode ${episodeNum} (${seasonEp})`);
  console.log(`📁 File: ${fileName}`);
  console.log(`📦 Size: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`⬆️  Uploading to R2...`);
  
  try {
    const fileContent = fs.readFileSync(localPath);
    
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: `videos/episode-${episodeNum}.mp4`,
      Body: fileContent,
      ContentType: 'video/mp4',
    });
    
    await s3Client.send(command);
    
    console.log(`✅ Uploaded successfully!`);
    return { episodeNum, success: true };
    
  } catch (error) {
    console.log(`❌ Upload failed: ${error.message}`);
    return { episodeNum, success: false, error: error.message };
  }
}

async function uploadBatch() {
  console.log('🎬 RickFlix R2 Upload Tool');
  console.log('=========================\n');
  console.log(`📂 Scanning: ${FOLDER_PATH}\n`);
  
  if (!fs.existsSync(FOLDER_PATH)) {
    console.error('❌ Folder not found!');
    return;
  }
  
  // Find all MP4 files
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
  
  if (files.length === 0) {
    console.error('❌ No MP4 files found in folder!');
    return;
  }
  
  console.log(`📂 Found ${files.length} MP4 files\n`);
  
  // Try to match files to episodes
  const matches = [];
  
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    
    // Try to extract season/episode from filename
    let match = fileName.match(/s(\d{2})e(\d{2})/i);
    if (!match) {
      match = fileName.match(/season\s*(\d+).*episode\s*(\d+)/i);
    }
    
    if (match) {
      const season = parseInt(match[1]);
      const episode = parseInt(match[2]);
      
      // Calculate episode number (1-81)
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
          file: file.name,
          episodeNum,
          fullPath: file.fullPath
        });
      }
    }
  }
  
  if (matches.length === 0) {
    console.log('❌ Could not detect episode numbers from filenames.');
    console.log('💡 Please rename files to include S##E## format (e.g., S01E01, S02E03, etc.)');
    return;
  }
  
  console.log('📋 Detected episodes:');
  matches.forEach(m => {
    console.log(`  ${episodeMap[m.episodeNum]} (${m.file}) → episode-${m.episodeNum}.mp4`);
  });
  
  console.log(`\n🚀 Starting upload of ${matches.length} episodes...\n`);
  
  const results = [];
  
  for (const match of matches) {
    const result = await uploadFile(match.fullPath, match.episodeNum);
    results.push(result);
    
    // Small delay between uploads
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n\n🎉 UPLOAD COMPLETE!');
  console.log('===================');
  console.log(`✅ Successful: ${successful}/${matches.length}`);
  console.log(`❌ Failed: ${failed}/${matches.length}`);
  
  if (failed > 0) {
    console.log('\n❌ Failed episodes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   Episode ${r.episodeNum}: ${r.error}`);
    });
  }
  
  console.log('\n💡 Fixed episodes are now live on your site!');
}

uploadBatch();
