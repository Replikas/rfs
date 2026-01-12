const { Storage } = require('megajs');
const fs = require('fs');
const path = require('path');

const ACCOUNT1_EMAIL = 'bbbreplika@gmail.com';
const ACCOUNT1_PASSWORD = 'Hotantenoci87.';
const ACCOUNT2_EMAIL = 'yoisan829@gmail.com';
const ACCOUNT2_PASSWORD = 'Hotantenoci87.';

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

async function getFileLinks(storage) {
  const files = storage.root.children;
  const results = [];
  
  for (const file of files) {
    if (file.name && file.name.startsWith('Episode ')) {
      const episodeMatch = file.name.match(/Episode (\d+)/);
      if (episodeMatch) {
        const episodeNum = parseInt(episodeMatch[1]);
        
        await new Promise((resolve, reject) => {
          file.link((error, url) => {
            if (error) {
              console.log(`⚠️  Episode ${episodeNum}: Failed to get link`);
              resolve();
            } else {
              const embedUrl = url.replace('https://mega.nz/file/', 'https://mega.nz/embed/');
              results.push({
                episodeNum,
                success: true,
                account: episodeNum <= 40 ? 1 : 2,
                fileName: file.name,
                url,
                embedUrl
              });
              console.log(`✅ Episode ${episodeNum}: ${embedUrl}`);
              resolve();
            }
          });
        });
      }
    }
  }
  
  return results;
}

async function main() {
  console.log('🔗 Retrieving All Mega.nz Links');
  console.log('================================\n');
  
  console.log('🔐 Logging in to Account 1...');
  const storage1 = await loginToMega(ACCOUNT1_EMAIL, ACCOUNT1_PASSWORD);
  console.log('✅ Logged in!\n');
  
  console.log('📂 Getting links for Episodes 1-40...\n');
  const results1 = await getFileLinks(storage1);
  
  console.log('\n🔐 Logging in to Account 2...');
  const storage2 = await loginToMega(ACCOUNT2_EMAIL, ACCOUNT2_PASSWORD);
  console.log('✅ Logged in!\n');
  
  console.log('📂 Getting links for Episodes 41-81...\n');
  const results2 = await getFileLinks(storage2);
  
  const allResults = [...results1, ...results2].sort((a, b) => a.episodeNum - b.episodeNum);
  
  console.log(`\n✅ Retrieved ${allResults.length} episode links`);
  
  // Save to file
  const reportPath = path.join(__dirname, 'mega-all-links.json');
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`📄 Saved to: ${reportPath}\n`);
}

main().catch(console.error);
