const { S3Client, ListObjectVersionsCommand } = require("@aws-sdk/client-s3");

const R2_ACCOUNT_ID = 'a52c58eca06d45b7c1b7a7c26d825275';
const R2_ACCESS_KEY_ID = '19d36d2d0021015005cc9f3dc833b03b';
const R2_SECRET_ACCESS_KEY = '0f3fa4789f860ea3a0fb742131bc9677828e75cbfddb4ed9f3e7a588abbcdf24';
const R2_BUCKET_NAME = 'rem';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function checkVersions() {
  console.log('🔍 Checking R2 for old versions of episode-1.mp4...\n');
  
  try {
    const command = new ListObjectVersionsCommand({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'videos/episode-1.mp4',
    });
    
    const response = await s3Client.send(command);
    
    if (response.Versions && response.Versions.length > 0) {
      console.log(`✅ Found ${response.Versions.length} version(s) of episode-1.mp4:\n`);
      
      response.Versions.forEach((version, index) => {
        console.log(`Version ${index + 1}:`);
        console.log(`  - Version ID: ${version.VersionId}`);
        console.log(`  - Last Modified: ${version.LastModified}`);
        console.log(`  - Size: ${(version.Size / 1024 / 1024).toFixed(1)} MB`);
        console.log(`  - IsLatest: ${version.IsLatest}`);
        console.log('');
      });
      
      console.log('🎉 GOOD NEWS! We can restore the old versions!');
      console.log('I can create a script to restore all 60 corrupted episodes.\n');
      
    } else {
      console.log('❌ No versions found. R2 versioning is NOT enabled.');
      console.log('The original files are permanently lost.\n');
      console.log('💡 You will need to re-download the original episodes.\n');
    }
    
  } catch (error) {
    console.error('❌ Error checking versions:', error.message);
    
    if (error.message.includes('not enabled')) {
      console.log('\n❌ R2 versioning is NOT enabled for this bucket.');
      console.log('The original files cannot be recovered.\n');
    }
  }
}

checkVersions();
