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

// Season 3 is episodes 22-31
const SEASON3_EPISODES = [22, 23, 24, 25, 26, 27, 28, 29, 30, 31];

async function convertToH264(inputPath, episodeNum) {
  const outputPath = path.join(__dirname, `temp-converted-${episodeNum}.mp4`);
  
  console.log(`  🎬 Converting HEVC → H.264 for browser compatibility...`);
  
  const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 192k -movflags +faststart -y "${outputPath}"`;
  
  try {
    await execPromise(ffmpegCommand, { maxBuffer: 1024 * 1024 * 200 });
    
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

async function processEpisode(episodeNum) {
  console.log(`\n📺 Episode ${episodeNum} (S03E${String(episodeNum - 21).padStart(2, '0')})`);
  console.log('━'.repeat(50));
  
  // Find the file
  const files = fs.readdirSync(FOLDER_PATH);
  const seasonEpCode = `s03e${String(episodeNum - 21).padStart(2, '0')}`;
  const file = files.find(f => f.toLowerCase().includes(seasonEpCode));
  
  if (!file) {
    console.log(`  ❌ File not found for episode ${episodeNum}`);
    return { episodeNum, success: false, error: 'File not found' };
  }
  
  const filePath = path.join(FOLDER_PATH, file);
  console.log(`  📁 Source: ${file}`);
  
  let convertedPath;
  
  try {
    // Convert HEVC to H.264
    convertedPath = await convertToH264(filePath, episodeNum);
    
    // Upload to R2
    await uploadToR2(convertedPath, episodeNum);
    
    console.log(`  🎉 Episode ${episodeNum} complete!`);
    
    return { episodeNum, success: true };
    
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

async function fixSeason3() {
  console.log('🎬 Season 3 HEVC → H.264 Converter');
  console.log('===================================');
  console.log('Season 3 episodes use HEVC codec which many browsers dont support.');
  console.log('This will convert them to H.264 for universal compatibility.\n');
  console.log(`📺 Episodes to fix: ${SEASON3_EPISODES.join(', ')}`);
  console.log('⏱️  Estimated time: 20-30 minutes\n');
  
  const results = [];
  const startTime = Date.now();
  
  for (const episodeNum of SEASON3_EPISODES) {
    const result = await processEpisode(episodeNum);
    results.push(result);
  }
  
  // Summary
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n\n🎉 CONVERSION COMPLETE!');
  console.log('=======================');
  console.log(`✅ Successful: ${successful}/${SEASON3_EPISODES.length}`);
  console.log(`❌ Failed: ${failed}/${SEASON3_EPISODES.length}`);
  console.log(`⏱️  Total time: ${totalTime} minutes`);
  
  if (failed > 0) {
    console.log('\n❌ Failed episodes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   Episode ${r.episodeNum}: ${r.error}`);
    });
  }
  
  console.log('\n✅ Season 3 now uses H.264 codec!');
  console.log('💡 Test on your site - video should now work on all browsers!');
}

// Check for FFmpeg
exec('ffmpeg -version', (error) => {
  if (error) {
    console.error('❌ FFmpeg not found! Please install FFmpeg first.');
    process.exit(1);
  }
  
  fixSeason3().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
});
