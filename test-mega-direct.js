const { Storage } = require('megajs');

const ACCOUNT1_EMAIL = 'bbbreplika@gmail.com';
const ACCOUNT1_PASSWORD = 'Hotantenoci87.';

async function loginToMega(email, password) {
  const storage = new Storage({ email, password });
  
  return new Promise((resolve, reject) => {
    storage.once('ready', () => {
      resolve(storage);
    });
    
    storage.once('error', (error) => {
      reject(new Error(`Login failed: ${error.message}`));
    });
  });
}

async function getDirectUrl() {
  console.log('🔐 Logging in to Mega.nz...');
  const storage = await loginToMega(ACCOUNT1_EMAIL, ACCOUNT1_PASSWORD);
  console.log('✅ Logged in!\n');
  
  const files = storage.root.children;
  const episode1 = files.find(f => f.name && f.name.startsWith('Episode 1'));
  
  if (episode1) {
    console.log('📺 Found Episode 1:', episode1.name);
    console.log('📋 File details:');
    console.log('  Size:', (episode1.size / 1024 / 1024).toFixed(1), 'MB');
    
    // Try to get streaming URL
    const streamUrl = episode1.downloadUrl;
    console.log('\n🔗 Download URL:', streamUrl);
    
    // Get share link
    episode1.link((error, url) => {
      if (!error) {
        console.log('🔗 Share URL:', url);
        console.log('🎬 Embed URL:', url.replace('https://mega.nz/file/', 'https://mega.nz/embed/'));
        
        // Try to get direct stream
        console.log('\n⚠️  Issue: Mega.nz does NOT support direct video streaming in custom players');
        console.log('⚠️  Videos must be played through Mega\'s own interface\n');
        console.log('💡 Recommendation: Use Google Drive instead for true embedding');
      }
    });
  }
}

getDirectUrl().catch(console.error);
