const { Storage } = require('megajs');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);

const ACCOUNTS = [
  {
    email: 'bbbreplika@gmail.com',
    password: 'Hotantenoci87.',
    label: 'Account 1 (Episodes 1-40)'
  },
  {
    email: 'yoisan829@gmail.com',
    password: 'Hotantenoci87.',
    label: 'Account 2 (Episodes 41-81)'
  }
];

async function loginToMega(email, password) {
  const storage = new Storage({ email, password });
  
  return new Promise((resolve, reject) => {
    storage.once('ready', () => resolve(storage));
    storage.once('error', (error) => reject(error));
  });
}

async function checkFileAudio(file, episodeNum) {
  const tempFile = path.join(__dirname, `temp-episode-${episodeNum}.mp4`);
  
  try {
    console.log(`  📥 Downloading for audio check...`);
    
    // Download file to temp location
    await new Promise((resolve, reject) => {
      const stream = file.download();
      const writeStream = fs.createWriteStream(tempFile);
      
      stream.pipe(writeStream);
      
      stream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', resolve);
    });
    
    console.log(`  🔍 Checking audio codec...`);
    
    // Check audio with ffprobe
    const { stdout } = await execPromise(
      `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,channels,sample_rate -of json "${tempFile}"`,
      { timeout: 10000 }
    );
    
    const info = JSON.parse(stdout);
    
    // Clean up temp file
    fs.unlinkSync(tempFile);
    
    if (!info.streams || info.streams.length === 0) {
      return {
        episodeNum,
        hasAudio: false,
        error: 'No audio stream found'
      };
    }
    
    const audioStream = info.streams[0];
    
    return {
      episodeNum,
      hasAudio: true,
      codec: audioStream.codec_name,
      channels: audioStream.channels,
      sampleRate: audioStream.sample_rate
    };
    
  } catch (error) {
    // Clean up temp file if exists
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    return {
      episodeNum,
      hasAudio: false,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔊 Checking Audio on All Mega.nz Videos');
  console.log('=========================================\n');
  
  const results = [];
  
  for (const account of ACCOUNTS) {
    console.log(`\n🔐 ${account.label}`);
    console.log(`   Logging in to ${account.email}...\n`);
    
    const storage = await loginToMega(account.email, account.password);
    console.log('   ✅ Logged in!\n');
    
    const files = storage.root.children;
    const episodes = files
      .filter(f => f.name && f.name.startsWith('Episode '))
      .sort((a, b) => {
        const numA = parseInt(a.name.match(/Episode (\d+)/)?.[1] || '0');
        const numB = parseInt(b.name.match(/Episode (\d+)/)?.[1] || '0');
        return numA - numB;
      });
    
    console.log(`   Found ${episodes.length} episodes\n`);
    
    for (const file of episodes) {
      const episodeMatch = file.name.match(/Episode (\d+)/);
      if (!episodeMatch) continue;
      
      const episodeNum = parseInt(episodeMatch[1]);
      
      console.log(`📺 Episode ${episodeNum}: ${file.name}`);
      console.log(`   📦 Size: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
      
      const audioCheck = await checkFileAudio(file, episodeNum);
      
      if (audioCheck.hasAudio) {
        console.log(`   ✅ Audio: ${audioCheck.codec} (${audioCheck.channels} channels, ${audioCheck.sampleRate} Hz)`);
      } else {
        console.log(`   ❌ No Audio: ${audioCheck.error}`);
      }
      
      results.push(audioCheck);
      console.log('');
    }
  }
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('===========\n');
  
  const withAudio = results.filter(r => r.hasAudio).length;
  const withoutAudio = results.filter(r => !r.hasAudio).length;
  
  console.log(`✅ Videos with audio: ${withAudio}`);
  console.log(`❌ Videos without audio: ${withoutAudio}\n`);
  
  if (withoutAudio > 0) {
    console.log('⚠️  Episodes with audio issues:');
    results.filter(r => !r.hasAudio).forEach(r => {
      console.log(`   - Episode ${r.episodeNum}: ${r.error}`);
    });
    console.log('');
  }
  
  // Save report
  const reportPath = path.join(__dirname, 'mega-audio-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: ${reportPath}\n`);
}

main().catch(console.error);
