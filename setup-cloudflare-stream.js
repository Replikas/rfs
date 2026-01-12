const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🔧 Cloudflare Stream Setup');
console.log('==========================\n');

console.log('To get your API token:');
console.log('1. Open: https://dash.cloudflare.com/profile/api-tokens');
console.log('2. Click "Create Token"');
console.log('3. Use template "Edit Cloudflare Stream"');
console.log('4. Click "Continue to summary" → "Create Token"');
console.log('5. Copy the token\n');

rl.question('Paste your Cloudflare Stream API token here: ', (token) => {
  if (!token || token.trim().length < 20) {
    console.log('\n❌ Invalid token. Please try again.\n');
    rl.close();
    return;
  }
  
  // Save token to .env.local
  const envPath = path.join(__dirname, '.env.local');
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Add or update the token
  if (envContent.includes('CLOUDFLARE_STREAM_API_TOKEN=')) {
    envContent = envContent.replace(
      /CLOUDFLARE_STREAM_API_TOKEN=.*/,
      `CLOUDFLARE_STREAM_API_TOKEN=${token.trim()}`
    );
  } else {
    envContent += `\nCLOUDFLARE_STREAM_API_TOKEN=${token.trim()}\n`;
  }
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n✅ API token saved to .env.local!');
  console.log('\n🚀 Now run: node upload-to-cloudflare-stream.js\n');
  
  rl.close();
});
