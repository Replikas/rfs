const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

// You'll need to create OAuth credentials at:
// https://console.cloud.google.com/apis/credentials
// Download the credentials.json file and put it in the same folder as this script

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH_1 = 'token-account1.json';
const TOKEN_PATH_2 = 'token-account2.json';

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

async function authorize(credentialsPath, tokenPath) {
  const credentials = JSON.parse(fs.readFileSync(credentialsPath));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token
  if (fs.existsSync(tokenPath)) {
    const token = JSON.parse(fs.readFileSync(tokenPath));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // Get new token
  return getNewToken(oAuth2Client, tokenPath);
}

function getNewToken(oAuth2Client, tokenPath) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 Authorize this app by visiting this url:');
  console.log('\n' + authUrl + '\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return reject('Error retrieving access token: ' + err);
        oAuth2Client.setCredentials(token);
        // Store the token for later use
        fs.writeFileSync(tokenPath, JSON.stringify(token));
        console.log('✅ Token stored to', tokenPath);
        resolve(oAuth2Client);
      });
    });
  });
}

async function uploadFile(auth, filePath, episodeNum) {
  const drive = google.drive({ version: 'v3', auth });
  const fileName = `Episode ${episodeNum} - ${episodeMap[episodeNum]}.mp4`;
  
  const fileMetadata = {
    name: fileName,
  };
  
  const media = {
    mimeType: 'video/mp4',
    body: fs.createReadStream(filePath),
  };

  try {
    const file = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Make the file accessible to anyone with the link
    await drive.permissions.create({
      fileId: file.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get the embed link
    const embedLink = `https://drive.google.com/file/d/${file.data.id}/preview`;
    
    return {
      id: file.data.id,
      webViewLink: file.data.webViewLink,
      embedLink: embedLink,
    };
  } catch (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }
}

async function main() {
  console.log('📤 Google Drive Upload Script for RickFlix');
  console.log('==========================================\n');

  // Check if credentials file exists
  if (!fs.existsSync('credentials.json')) {
    console.log('❌ credentials.json not found!');
    console.log('\n📋 Setup Instructions:');
    console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
    console.log('2. Create a new project (e.g., "RickFlix Upload")');
    console.log('3. Enable Google Drive API');
    console.log('4. Create OAuth 2.0 Client ID (Desktop app)');
    console.log('5. Download credentials.json');
    console.log('6. Place it in the same folder as this script\n');
    return;
  }

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
      
      if (episodeNum > 0 && episodeNum <= 81) {
        episodeFiles[episodeNum] = file.fullPath;
      }
    }
  }

  console.log(`✅ Found ${Object.keys(episodeFiles).length} episodes\n`);

  // Authorize Account 1 (Episodes 1-40)
  console.log('🔐 Account 1 (Episodes 1-40) - Authorization Required');
  console.log('================================================\n');
  const auth1 = await authorize('credentials.json', TOKEN_PATH_1);
  console.log('✅ Account 1 authorized!\n');

  // Authorize Account 2 (Episodes 41-81)
  console.log('🔐 Account 2 (Episodes 41-81) - Authorization Required');
  console.log('================================================\n');
  const auth2 = await authorize('credentials.json', TOKEN_PATH_2);
  console.log('✅ Account 2 authorized!\n');

  const results = [];
  let successCount = 0;
  let failCount = 0;

  // Upload Episodes 1-40 to Account 1
  console.log('\n📤 Uploading to Account 1 (Episodes 1-40)...\n');
  for (let i = 1; i <= 40; i++) {
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
      const result = await uploadFile(auth1, filePath, i);
      console.log(`   ✅ Uploaded! ID: ${result.id}`);
      results.push({ episodeNum: i, success: true, ...result });
      successCount++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({ episodeNum: i, success: false, error: error.message });
      failCount++;
    }
    console.log('');
  }

  // Upload Episodes 41-81 to Account 2
  console.log('\n📤 Uploading to Account 2 (Episodes 41-81)...\n');
  for (let i = 41; i <= 81; i++) {
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
      const result = await uploadFile(auth2, filePath, i);
      console.log(`   ✅ Uploaded! ID: ${result.id}`);
      results.push({ episodeNum: i, success: true, ...result });
      successCount++;
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({ episodeNum: i, success: false, error: error.message });
      failCount++;
    }
    console.log('');
  }

  // Summary
  console.log('\n🎉 UPLOAD COMPLETE!');
  console.log('===================');
  console.log(`✅ Successful: ${successCount}/81`);
  console.log(`❌ Failed: ${failCount}/81\n`);

  // Save results
  const reportPath = path.join(__dirname, 'gdrive-upload-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved: ${reportPath}\n`);

  console.log('🔗 Next steps:');
  console.log('1. Check the gdrive-upload-results.json file for all embed links');
  console.log('2. Update your video player to use these Google Drive embeds\n');
}

main().catch(console.error);
