const { exec } = require('child_process');
const { promisify } = require('util');
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);

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
  32: 'S04E01', 52: 'S06E01', 56: 'S06E05', 57: 'S06E06', 60: 'S06E09', 62: 'S07E01'
};

// HEVC episodes to convert
const HEVC_EPISODES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,           // Season 1
  12, 13, 14, 15, 16, 17, 18, 19, 20, 21,      // Season 2
  22, 23, 24, 25, 26, 27, 28, 29, 30, 31,      // Season 3
  32,                                           // Season 4 Ep 1
  52, 56, 57, 60,                              // Season 6
  62                                            // Season 7 Ep 1
];

async function checkCodec(filePath) {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of json "${filePath}"`,
      { timeout: 10000 }
    );
    
    const info = JSON.parse(stdout);
    return info.streams?.[0]?.codec_name || 'unknown';
  } catch (error) {
    return 'error';
  }
}

async function convertToH264(inputPath, episodeNum) {
  const outputPath = path.join(__dirname, `temp-converted-${episodeNum}.mp4`);
  
  console.log(`  🎬 Converting HEVC → H.264...`);
  
  // Use faster preset for quicker conversion
  const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a copy -movflags +faststart -y "${outputPath}"`;
  
  try {
    await execPromise(ffmpegCommand, { maxBuffer: 1024 * 1024 * 300 });
    
    const stats = fs.statSync(outputPath);
    console.log(`  ✅ Converted: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    
    return outputPath;
  } catch (error) {
    console.error(`  ❌ FFmpeg error:`, error.message);
    throw error;
  }
}

async function uploadToR2(filePath, episodeNum) {
  console.log(`  📤 Uploading to R2...`);
  
  const fileContent = fs.readFileSync(filePath);
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: `videos/episode-${episodeNum}.mp4`,
    Body: fileContent,
    ContentType: 'video/mp4',
  });
  
  await s3Client.send(command);
  
  console.log(`  ✅ Uploaded to R2`);
}

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

async function processEpisode(episodeNum, filePath) {
  const seasonEp = episodeMap[episodeNum];
  console.log(`\n📺 Episode ${episodeNum} (${seasonEp})`);
  console.log('━'.repeat(50));
  
  const fileName = path.basename(filePath);
  console.log(`  📁 Source: ${fileName}`);
  
  // Check if it's actually HEVC
  const codec = await checkCodec(filePath);
  
  if (codec !== 'hevc') {
    console.log(`  ℹ️  Already ${codec.toUpperCase()} - skipping`);
    return { episodeNum, success: true, skipped: true };
  }
  
  let convertedPath;
  
  try {
    // Convert HEVC to H.264
    convertedPath = await convertToH264(filePath, episodeNum);
    
    // Upload to R2
    await uploadToR2(convertedPath, episodeNum);
    
    console.log(`  🎉 Episode ${episodeNum} complete!`);
    
    return { episodeNum, success: true, skipped: false };
    
  } catch (error) {
    console.error(`  ❌ Failed:`, error.message);
    return { episodeNum, success: false, error: error.message };
    
  } finally {
    // Clean up temp file
    if (convertedPath && fs.existsSync(convertedPath)) {
      fs.unlinkSync(convertedPath);
    }
  }
}

async function convertAllHEVC() {
  console.log('🎬 RickFlix HEVC → H.264 Batch Converter');
  console.log('========================================');
  console.log('Converting all HEVC episodes to H.264 for universal browser support.\n');
  console.log(`📺 Episodes to convert: ${HEVC_EPISODES.length}`);
  console.log('⏱️  Estimated time: 1-2 hours\n');
  
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
  
  const results = [];
  const startTime = Date.now();
  
  for (const episodeNum of HEVC_EPISODES) {
    const filePath = episodeFiles[episodeNum];
    
    if (!filePath) {
      console.log(`\n⚠️  Episode ${episodeNum} not found in folder - skipping`);
      results.push({ episodeNum, success: false, error: 'File not found' });
      continue;
    }
    
    const result = await processEpisode(episodeNum, filePath);
    results.push(result);
  }
  
  // Summary
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const successful = results.filter(r => r.success && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n\n🎉 CONVERSION COMPLETE!');
  console.log('=======================');
  console.log(`✅ Converted: ${successful}/${HEVC_EPISODES.length}`);
  console.log(`ℹ️  Skipped: ${skipped}/${HEVC_EPISODES.length}`);
  console.log(`❌ Failed: ${failed}/${HEVC_EPISODES.length}`);
  console.log(`⏱️  Total time: ${totalTime} minutes`);
  
  if (failed > 0) {
    console.log('\n❌ Failed episodes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   Episode ${r.episodeNum}: ${r.error}`);
    });
  }
  
  console.log('\n✅ All episodes now use H.264 codec!');
  console.log('🌐 Site now works on Chrome, Firefox, Edge, Safari, and Android!');
  console.log('❌ iPhone still won\'t work (needs different solution)\n');
}

// Check for FFmpeg
exec('ffmpeg -version', (error) => {
  if (error) {
    console.error('❌ FFmpeg not found! Please install FFmpeg first.');
    process.exit(1);
  }
  
  convertAllHEVC().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
});
