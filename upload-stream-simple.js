const https = require('https');
const fs = require('fs');
const path = require('path');

// Load API token
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envContent.match(/CLOUDFLARE_STREAM_API_TOKEN=(.+)/);
const API_TOKEN = tokenMatch[1].trim();

const CLOUDFLARE_ACCOUNT_ID = 'a52c58eca06d45b7c1b7a7c26d825275';
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

async function uploadFile(filePath, episodeNum) {
  return new Promise((resolve, reject) => {
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    
    // Use TUS protocol for upload
    const boundary = `----WebKitFormBoundary${Date.now()}${Math.random().toString(36)}`;
    
    const options = {
      method: 'POST',
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
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
              embedUrl: `https://customer-${CLOUDFLARE_ACCOUNT_ID}.cloudflarestream.com/${response.result.uid}/iframe`,
            });
          } else {
            reject(new Error(response.errors?.[0]?.message || JSON.stringify(response)));
          }
        } catch (error) {
          reject(new Error('Response: ' + data));
        }
      });
    });
    
    req.on('error', reject);
    
    // Build multipart form data manually
    let formData = '';
    
    // Add metadata
    formData += `--${boundary}\r\n`;
    formData += `Content-Disposition: form-data; name="meta"\r\n\r\n`;
    formData += JSON.stringify({ name: `Episode ${episodeNum}` });
    formData += `\r\n`;
    
    // Write initial form data
    req.write(formData);
    
    // Add file
    req.write(`--${boundary}\r\n`);
    req.write(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`);
    req.write(`Content-Type: video/mp4\r\n\r\n`);
    
    const fileStream = fs.createReadStream(filePath);
    
    fileStream.on('data', (chunk) => {
      req.write(chunk);
    });
    
    fileStream.on('end', () => {
      req.write(`\r\n--${boundary}--\r\n`);
      req.end();
    });
    
    fileStream.on('error', reject);
  });
}

async function main() {
  console.log('📤 Uploading to Cloudflare Stream (Direct Upload)');
  console.log('=================================================\n');
  
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
  
  // Test with Episode 1 first
  console.log('🧪 Testing with Episode 1...\n');
  
  const testFile = episodeFiles[1];
  console.log(`📺 Episode 1: ${path.basename(testFile)}`);
  console.log(`   📦 Size: ${(fs.statSync(testFile).size / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   📤 Uploading...`);
  
  try {
    const result = await uploadFile(testFile, 1);
    console.log(`   ✅ Success!`);
    console.log(`   🎬 Video ID: ${result.videoId}`);
    console.log(`   🔗 Embed URL: ${result.embedUrl}\n`);
    console.log('✅ Upload works! Ready to upload all 81 episodes.\n');
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}\n`);
    console.log('❌ There\'s still an issue. Let me know the error and we\'ll fix it.');
  }
}

main().catch(console.error);
