const https = require('https');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const tokenMatch = envContent.match(/CLOUDFLARE_STREAM_API_TOKEN=(.+)/);
  if (tokenMatch) {
    process.env.CLOUDFLARE_STREAM_API_TOKEN = tokenMatch[1].trim();
  }
}

// Cloudflare Stream API credentials
const CLOUDFLARE_ACCOUNT_ID = 'a52c58eca06d45b7c1b7a7c26d825275';
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_STREAM_API_TOKEN;

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

async function uploadToStream(filePath, episodeNum) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    const fileName = path.basename(filePath);
    const fileStream = fs.createReadStream(filePath);
    
    form.append('file', fileStream, fileName);
    
    // Metadata - just the name for now
    form.append('meta', JSON.stringify({
      name: `Episode ${episodeNum}`
    }));
    
    const options = {
      method: 'POST',
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        ...form.getHeaders(),
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (response.success) {
            resolve({
              episodeNum,
              videoId: response.result.uid,
              playbackUrl: `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${response.result.uid}/manifest/video.m3u8`,
              embedUrl: `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${response.result.uid}/iframe`,
              thumbnailUrl: response.result.thumbnail,
            });
          } else {
            reject(new Error(response.errors?.[0]?.message || 'Upload failed'));
          }
        } catch (error) {
          reject(new Error('Failed to parse response: ' + data));
        }
      });
    });
    
    req.on('error', reject);
    
    form.pipe(req);
  });
}

async function main() {
  console.log('📤 Uploading Videos to Cloudflare Stream');
  console.log('=========================================\n');
  
  if (!CLOUDFLARE_API_TOKEN || CLOUDFLARE_API_TOKEN === 'YOUR_API_TOKEN_HERE') {
    console.log('❌ ERROR: Cloudflare Stream API token not found!\n');
    console.log('Please run: node setup-cloudflare-stream.js\n');
    console.log('This will guide you through getting your API token.\n');
    return;
  }
  
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
  console.log('⏱️  Estimated upload time: 2-4 hours\n');
  console.log('📺 Cloudflare Stream will auto-transcode for iPhone!\n\n');
  
  const results = [];
  let successCount = 0;
  let failCount = 0;
  
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
    console.log(`   📤 Uploading...`);
    
    try {
      const result = await uploadToStream(filePath, i);
      
      console.log(`   ✅ Upload complete!`);
      console.log(`   🎬 Video ID: ${result.videoId}`);
      console.log(`   🔗 Embed URL: ${result.embedUrl}\n`);
      
      results.push(result);
      successCount++;
      
      // Save progress after each upload
      fs.writeFileSync(
        path.join(__dirname, 'cloudflare-stream-results.json'),
        JSON.stringify(results, null, 2)
      );
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}\n`);
      failCount++;
    }
  }
  
  console.log('\n🎉 UPLOAD COMPLETE!');
  console.log('===================');
  console.log(`✅ Successful: ${successCount}/81`);
  console.log(`❌ Failed: ${failCount}/81\n`);
  
  if (successCount > 0) {
    console.log('📄 Results saved to: cloudflare-stream-results.json\n');
    console.log('🔄 Cloudflare Stream is now transcoding your videos...');
    console.log('⏱️  Transcoding will take 10-30 minutes');
    console.log('✅ Once done, videos will work on iPhone automatically!\n');
  }
}

main().catch(console.error);
