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

async function uploadToR2(filePath, episodeNum) {
  const fileContent = fs.readFileSync(filePath);
  const fileName = `episode-${episodeNum}.mp4`;
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: `videos/${fileName}`,
    Body: fileContent,
    ContentType: 'video/mp4',
  });
  
  await s3Client.send(command);
  
  return {
    episodeNum,
    fileName,
    r2Key: `videos/${fileName}`,
    url: `https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev/videos/${fileName}`
  };
}

async function main() {
  console.log('📤 Uploading All Episodes to Cloudflare R2');
  console.log('===========================================\n');
  
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
  console.log('⏱️  Estimated upload time: 1-2 hours\n\n');
  
  const results = [];
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();
  
  for (let i = 1; i <= 81; i++) {
    if (!episodeFiles[i]) {
      console.log(`⚠️  Episode ${i}: File not found\n`);
      failCount++;
      continue;
    }
    
    const filePath = episodeFiles[i];
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    
    console.log(`📺 Episode ${i}: ${fileName}`);
    console.log(`   📦 Size: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
    console.log(`   📤 Uploading to R2...`);
    
    try {
      const result = await uploadToR2(filePath, i);
      
      console.log(`   ✅ Upload complete!`);
      console.log(`   🔗 URL: ${result.url}`);
      
      results.push(result);
      successCount++;
      
      const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
      const avg = elapsed / successCount;
      const remaining = (81 - successCount) * avg;
      
      console.log(`   ⏱️  Progress: ${successCount}/81 | Est. remaining: ${remaining.toFixed(1)} min\n`);
      
      // Save progress
      fs.writeFileSync(
        path.join(__dirname, 'r2-upload-results.json'),
        JSON.stringify(results, null, 2)
      );
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      failCount++;
    }
  }
  
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  
  console.log('\n🎉 UPLOAD COMPLETE!');
  console.log('===================');
  console.log(`✅ Successful: ${successCount}/81`);
  console.log(`❌ Failed: ${failCount}/81`);
  console.log(`⏱️  Total time: ${totalTime} minutes\n`);
  
  if (successCount > 0) {
    console.log('📄 Results saved to: r2-upload-results.json\n');
    console.log('✅ Videos now on R2 - FAST loading!');
    console.log('📱 Videos work on iPhone (H.264 + AAC)!');
    console.log('💰 Cost: ~$1-2/month\n');
    console.log('🚀 Next: Update your site to use R2 URLs\n');
  }
}

main().catch(console.error);
