const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

const R2_PUBLIC_URL = 'https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev';
const TOTAL_EPISODES = 81;

// You'll need to add your R2 credentials here
const R2_ACCOUNT_ID = 'a52c58eca06d45b7c1b7a7c26d825275';
const R2_ACCESS_KEY_ID = '19d36d2d0021015005cc9f3dc833b03b';
const R2_SECRET_ACCESS_KEY = '0f3fa4789f860ea3a0fb742131bc9677828e75cbfddb4ed9f3e7a588abbcdf24';
const R2_BUCKET_NAME = 'rem';

async function downloadVideo(episodeId) {
  const url = `${R2_PUBLIC_URL}/videos/episode-${episodeId}.mp4`;
  const tempPath = path.join(__dirname, `temp-${episodeId}.mp4`);
  
  console.log(`  📥 Downloading from R2...`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.statusText}`);
  }
  
  const fileStream = fs.createWriteStream(tempPath);
  await new Promise((resolve, reject) => {
    response.body.pipe(fileStream);
    response.body.on('error', reject);
    fileStream.on('finish', resolve);
  });
  
  const stats = fs.statSync(tempPath);
  console.log(`  ✅ Downloaded: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
  
  return tempPath;
}

async function reEncodeVideo(inputPath, episodeId) {
  const outputPath = path.join(__dirname, `encoded-${episodeId}.mp4`);
  
  console.log(`  🎬 Re-encoding for iPhone compatibility...`);
  
  const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -profile:v baseline -level 3.0 -pix_fmt yuv420p -c:a aac -b:a 192k -ar 48000 -movflags +faststart -y "${outputPath}"`;
  
  try {
    await execPromise(ffmpegCommand, { maxBuffer: 1024 * 1024 * 100 });
    
    const stats = fs.statSync(outputPath);
    console.log(`  ✅ Re-encoded: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
    
    return outputPath;
  } catch (error) {
    console.error(`  ❌ FFmpeg error:`, error.message);
    throw error;
  }
}

async function uploadToR2(filePath, episodeId) {
  console.log(`  📤 Uploading back to R2...`);
  
  // Using AWS SDK for S3 (R2 is S3-compatible)
  const AWS = require('aws-sdk');
  
  const s3 = new AWS.S3({
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    signatureVersion: 'v4',
  });
  
  const fileContent = fs.readFileSync(filePath);
  
  const params = {
    Bucket: R2_BUCKET_NAME,
    Key: `videos/episode-${episodeId}.mp4`,
    Body: fileContent,
    ContentType: 'video/mp4',
  };
  
  await s3.putObject(params).promise();
  
  console.log(`  ✅ Uploaded to R2`);
}

async function processEpisode(episodeId) {
  console.log(`\n📺 Episode ${episodeId}/${TOTAL_EPISODES}`);
  console.log('━'.repeat(50));
  
  let tempPath, encodedPath;
  
  try {
    // Download
    tempPath = await downloadVideo(episodeId);
    
    // Re-encode
    encodedPath = await reEncodeVideo(tempPath, episodeId);
    
    // Upload
    await uploadToR2(encodedPath, episodeId);
    
    console.log(`  🎉 Episode ${episodeId} complete!`);
    
    return { episodeId, success: true };
    
  } catch (error) {
    console.error(`  ❌ Failed:`, error.message);
    return { episodeId, success: false, error: error.message };
    
  } finally {
    // Clean up temp files
    if (tempPath && fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    if (encodedPath && fs.existsSync(encodedPath)) {
      fs.unlinkSync(encodedPath);
    }
  }
}

async function reEncodeAll() {
  console.log('🎬 RickFlix R2 Re-Encoding Tool');
  console.log('================================');
  console.log(`Target: ${R2_PUBLIC_URL}`);
  console.log(`Episodes: 1-${TOTAL_EPISODES}`);
  console.log('\n⚠️  This will:');
  console.log('  • Download each video from R2');
  console.log('  • Re-encode for iPhone compatibility');
  console.log('  • Upload back to R2 (replaces original)');
  console.log('  • Take ~2-3 hours');
  console.log('\nPress Ctrl+C to cancel...\n');
  
  // Wait 5 seconds to allow cancel
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const results = [];
  const startTime = Date.now();
  
  // Process one at a time
  for (let episodeId = 1; episodeId <= TOTAL_EPISODES; episodeId++) {
    const result = await processEpisode(episodeId);
    results.push(result);
  }
  
  // Summary
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n\n🎉 RE-ENCODING COMPLETE!');
  console.log('========================');
  console.log(`✅ Successful: ${successful}/${TOTAL_EPISODES}`);
  console.log(`❌ Failed: ${failed}/${TOTAL_EPISODES}`);
  console.log(`⏱️  Total time: ${totalTime} minutes`);
  
  if (failed > 0) {
    console.log('\n❌ Failed episodes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   Episode ${r.episodeId}: ${r.error}`);
    });
  }
  
  console.log('\n🍎 All videos now iPhone compatible!');
  console.log('💡 You can now remove the transcoding server from Railway!');
}

// Check for FFmpeg
exec('ffmpeg -version', (error) => {
  if (error) {
    console.error('❌ FFmpeg not found! Please install FFmpeg first.');
    console.error('Download from: https://ffmpeg.org/download.html');
    process.exit(1);
  }
  
  // Run
  reEncodeAll().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
});
