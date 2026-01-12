const { Storage } = require('megajs');

const ACCOUNT2_EMAIL = 'yoisan829@gmail.com';
const ACCOUNT2_PASSWORD = 'Hotantenoci87.';

// Episodes to delete temporarily (non-fixed ones to free space)
// We'll keep: 41, 48, 49, 51, 54, 56-65, 72-81
// We'll delete: 42-47, 50, 52, 53, 55 (10 episodes)
const TO_DELETE = [42, 43, 44, 45, 46, 47, 50, 52, 53, 55];

async function loginToMega(email, password) {
  const storage = new Storage({ email, password });
  
  return new Promise((resolve, reject) => {
    storage.once('ready', () => {
      console.log(`✅ Logged in to ${email}\n`);
      resolve(storage);
    });
    
    storage.once('error', (error) => {
      reject(new Error(`Login failed: ${error.message}`));
    });
  });
}

async function deleteEpisode(file) {
  return new Promise((resolve, reject) => {
    file.delete((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function main() {
  console.log('🗑️  Cleaning Up Mega Account 2');
  console.log('==============================\n');
  console.log('Deleting 10 non-fixed episodes to free space...\n');
  
  const storage = await loginToMega(ACCOUNT2_EMAIL, ACCOUNT2_PASSWORD);
  
  const files = storage.root.children;
  
  // Get current storage info
  const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
  console.log(`📊 Current storage: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB\n`);
  
  let deletedCount = 0;
  let freedSpace = 0;
  
  for (const episodeNum of TO_DELETE) {
    const file = files.find(f => f.name && f.name.startsWith(`Episode ${episodeNum} `));
    
    if (file) {
      console.log(`📺 Episode ${episodeNum}: ${file.name}`);
      console.log(`   📦 Size: ${(file.size / 1024 / 1024).toFixed(1)} MB`);
      
      try {
        await deleteEpisode(file);
        console.log(`   ✅ Deleted\n`);
        deletedCount++;
        freedSpace += file.size;
      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}\n`);
      }
    } else {
      console.log(`⚠️  Episode ${episodeNum}: Not found\n`);
    }
  }
  
  console.log('🎉 CLEANUP COMPLETE!');
  console.log('====================');
  console.log(`✅ Deleted: ${deletedCount} episodes`);
  console.log(`💾 Freed: ${(freedSpace / 1024 / 1024 / 1024).toFixed(2)} GB\n`);
  console.log('📤 Next: Re-upload episodes 66-71\n');
}

main().catch(console.error);
