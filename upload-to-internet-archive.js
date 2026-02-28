const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// Internet Archive credentials
// You'll need to create a free account at https://archive.org/account/signup
const IA_EMAIL = process.env.IA_EMAIL || 'YOUR_EMAIL';
const IA_PASSWORD = process.env.IA_PASSWORD || 'YOUR_PASSWORD';

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

async function uploadToInternetArchive(filePath, episodeNum) {
  const fileName = path.basename(filePath);
  
  // Create a unique identifier for this episode
  const identifier = `rick-and-morty-episode-${episodeNum}`;
  
  console.log(`   📤 Uploading via ia CLI tool...`);
  
  try {
    // Use Internet Archive CLI (ia) to upload
    // Install with: pip install internetarchive
    const { stdout, stderr } = await execPromise(
      `ia upload "${identifier}" "${filePath}" --metadata="title:Rick and Morty Episode ${episodeNum}" --metadata="mediatype:movies" --metadata="collection:opensource_movies" --metadata="description:Rick and Morty Season Episode ${episodeNum}"`,
      { maxBuffer: 1024 * 1024 * 500 }
    );
    
    return {
      episodeNum,
      identifier,
      url: `https://archive.org/details/${identifier}`,
      embedUrl: `https://archive.org/embed/${identifier}`,
      directUrl: `https://archive.org/download/${identifier}/${fileName}`
    };
    
  } catch (error) {
    throw new Error(error.stderr || error.message);
  }
}

async function checkIACLI() {
  try {
    await execPromise('ia --version');
    return true;
  } catch (error) {
    return false;
  }
}

async function configureIA() {
  console.log('🔐 Configuring Internet Archive credentials...\n');
  
  try {
    await execPromise(`ia configure --username="${IA_EMAIL}" --password="${IA_PASSWORD}"`);
    console.log('✅ Credentials configured!\n');
    return true;
  } catch (error) {
    console.log('❌ Failed to configure:', error.message);
    return false;
  }
}

async function main() {
  console.log('📤 Uploading to Internet Archive (FREE & Unlimited!)');
  console.log('====================================================\n');
  
  // Check if email/password are set
  if (IA_EMAIL === 'YOUR_EMAIL') {
    console.log('⚠️  Please set up your Internet Archive account first!\n');
    console.log('Steps:');
    console.log('1. Create account at: https://archive.org/account/signup');
    console.log('2. Install Python and internetarchive CLI:');
    console.log('   pip install internetarchive');
    console.log('3. Edit this script and add your email/password\n');
    return;
  }
  
  // Check if ia CLI is installed
  const hasIA = await checkIACLI();
  
  if (!hasIA) {
    console.log('❌ Internet Archive CLI not found!\n');
    console.log('Install it with:');
    console.log('  pip install internetarchive\n');
    console.log('Then run this script again.\n');
    return;
  }
  
  console.log('✅ Internet Archive CLI found!\n');
  
  // Configure credentials
  const configured = await configureIA();
  if (!configured) {
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
  console.log('🆓 Internet Archive: FREE, unlimited, works on iPhone!\n\n');
  
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
    
    try {
      const result = await uploadToInternetArchive(filePath, i);
      
      console.log(`   ✅ Upload complete!`);
      console.log(`   🔗 URL: ${result.url}`);
      console.log(`   📺 Embed: ${result.embedUrl}\n`);
      
      results.push(result);
      successCount++;
      
      // Save progress
      fs.writeFileSync(
        path.join(__dirname, 'internet-archive-results.json'),
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
    console.log('📄 Results saved to: internet-archive-results.json\n');
    console.log('✅ Videos are now hosted on Internet Archive - FREE forever!');
    console.log('📱 Videos work on iPhone, Android, and all browsers!\n');
  }
}

main().catch(console.error);
