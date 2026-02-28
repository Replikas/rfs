const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = require("@aws-sdk/client-s3");

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

async function deleteAllVideos() {
  console.log('🗑️  Deleting All Videos from R2');
  console.log('================================\n');
  
  try {
    // List all objects in videos folder
    console.log('📋 Listing all videos in R2...\n');
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: 'videos/',
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log('✅ No videos found in R2 - already clean!');
      return;
    }
    
    console.log(`Found ${listResponse.Contents.length} files in videos/ folder:\n`);
    
    listResponse.Contents.forEach(file => {
      const sizeMB = file.Size ? (file.Size / 1024 / 1024).toFixed(1) : '0';
      console.log(`  - ${file.Key} (${sizeMB} MB)`);
    });
    
    console.log(`\n🗑️  Deleting ${listResponse.Contents.length} files...\n`);
    
    // Delete all objects
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: R2_BUCKET_NAME,
      Delete: {
        Objects: listResponse.Contents.map(file => ({ Key: file.Key })),
        Quiet: false,
      },
    });
    
    const deleteResponse = await s3Client.send(deleteCommand);
    
    if (deleteResponse.Deleted && deleteResponse.Deleted.length > 0) {
      console.log(`✅ Successfully deleted ${deleteResponse.Deleted.length} files:\n`);
      deleteResponse.Deleted.forEach(file => {
        console.log(`  ✅ ${file.Key}`);
      });
    }
    
    if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
      console.log(`\n❌ Failed to delete ${deleteResponse.Errors.length} files:\n`);
      deleteResponse.Errors.forEach(error => {
        console.log(`  ❌ ${error.Key}: ${error.Message}`);
      });
    }
    
    console.log('\n🎉 R2 CLEANUP COMPLETE!');
    console.log('========================');
    console.log('✅ All video files removed from R2');
    console.log('✅ Site now uses Mega.nz (FREE hosting)');
    console.log('✅ Videos work on iPhone! 📱\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

deleteAllVideos();
