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

async function convertToH264(inputPath) {
  const outputPath = path.join(__dirname, 'temp-converted-62.mp4');
  
  console.log('  🎬 Converting AV1 → H.264...');
  
  const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k -movflags +faststart -y "${outputPath}"`;
  
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

async function uploadToR2(filePath) {
  console.log('  📤 Uploading to R2...');
  
  const fileContent = fs.readFileSync(filePath);
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: 'videos/episode-62.mp4',
    Body: fileContent,
    ContentType: 'video/mp4',
  });
  
  await s3Client.send(command);
  
  console.log('  ✅ Uploaded to R2');
}

async function convertEpisode62() {
  console.log('🎬 Converting Episode 62 (S07E01)');
  console.log('==================================\n');
  
  // Find the file
  const files = fs.readdirSync(FOLDER_PATH);
  const file = files.find(f => f.toLowerCase().includes('s07e01'));
  
  if (!file) {
    console.error('❌ Episode 62 file not found!');
    return;
  }
  
  const filePath = path.join(FOLDER_PATH, file);
  console.log(`📁 Source: ${file}\n`);
  
  let convertedPath;
  
  try {
    convertedPath = await convertToH264(filePath);
    await uploadToR2(convertedPath);
    
    console.log('\n🎉 Episode 62 converted successfully!');
    console.log('✅ Now works on all browsers (except iPhone)\n');
    
  } catch (error) {
    console.error('\n❌ Conversion failed:', error.message);
  } finally {
    if (convertedPath && fs.existsSync(convertedPath)) {
      fs.unlinkSync(convertedPath);
    }
  }
}

exec('ffmpeg -version', (error) => {
  if (error) {
    console.error('❌ FFmpeg not found!');
    process.exit(1);
  }
  
  convertEpisode62();
});
