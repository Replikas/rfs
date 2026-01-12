const https = require('https');
const fs = require('fs');
const path = require('path');

// Load API token
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const tokenMatch = envContent.match(/CLOUDFLARE_STREAM_API_TOKEN=(.+)/);
const API_TOKEN = tokenMatch[1].trim();

const CLOUDFLARE_ACCOUNT_ID = 'a52c58eca06d45b7c1b7a7c26d825275';

function checkStreamAccess() {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'GET',
      hostname: 'api.cloudflare.com',
      path: `/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  console.log('🔍 Checking Cloudflare Stream Access');
  console.log('====================================\n');
  
  try {
    const response = await checkStreamAccess();
    
    console.log(`Status Code: ${response.statusCode}\n`);
    
    const data = JSON.parse(response.data);
    
    if (data.success) {
      console.log('✅ Stream API is accessible!');
      console.log(`📊 Total videos: ${data.result ? data.result.length : 0}\n`);
      
      if (data.result && data.result.length > 0) {
        console.log('Existing videos:');
        data.result.slice(0, 5).forEach(video => {
          console.log(`  - ${video.meta?.name || 'Unnamed'} (${video.uid})`);
        });
        if (data.result.length > 5) {
          console.log(`  ... and ${data.result.length - 5} more`);
        }
      }
      
      console.log('\n✅ Your account has Cloudflare Stream enabled!');
      console.log('🚀 Ready to upload videos!\n');
      
    } else {
      console.log('❌ API Error:', JSON.stringify(data.errors, null, 2));
      
      if (JSON.stringify(data).includes('not enabled')) {
        console.log('\n⚠️  Cloudflare Stream is NOT enabled on this account.');
        console.log('To enable it:');
        console.log('1. Go to https://dash.cloudflare.com/' + CLOUDFLARE_ACCOUNT_ID + '/stream');
        console.log('2. Click "Get Started" to enable Stream\n');
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

main();
