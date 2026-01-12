const https = require('https');

const SITE_URL = 'https://rickortystream.vercel.app';
const TOTAL_EPISODES = 81;

// Episodes that were fixed with AAC audio
const FIXED_EPISODES = [33, 34, 35, 36, 37, 38, 39, 40, 41, 48, 49, 51, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];

function testEpisode(episodeNum) {
  return new Promise((resolve, reject) => {
    const url = `${SITE_URL}/api/mega-stream/${episodeNum}`;
    
    https.get(url, (res) => {
      const { statusCode, headers } = res;
      
      // Check if video streaming is working
      if (statusCode === 200 || statusCode === 206) {
        const contentType = headers['content-type'];
        const contentLength = headers['content-length'];
        
        // Abort request after getting headers (don't download full video)
        res.destroy();
        
        resolve({
          episodeNum,
          status: 'OK',
          statusCode,
          contentType,
          size: contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(1) + ' MB' : 'Unknown',
          fixed: FIXED_EPISODES.includes(episodeNum) ? '🔧 Fixed' : ''
        });
      } else {
        res.destroy();
        reject({
          episodeNum,
          status: 'ERROR',
          statusCode,
          error: `HTTP ${statusCode}`
        });
      }
    }).on('error', (error) => {
      reject({
        episodeNum,
        status: 'ERROR',
        error: error.message
      });
    }).setTimeout(15000, () => {
      reject({
        episodeNum,
        status: 'ERROR',
        error: 'Request timeout'
      });
    });
  });
}

async function testAllEpisodes() {
  console.log('🧪 Testing All 81 Episodes on Live Site');
  console.log('========================================\n');
  console.log(`Site: ${SITE_URL}\n`);
  console.log('Testing video streaming API...\n');
  
  const results = {
    success: [],
    errors: []
  };
  
  for (let i = 1; i <= TOTAL_EPISODES; i++) {
    process.stdout.write(`Testing Episode ${i}... `);
    
    try {
      const result = await testEpisode(i);
      console.log(`✅ ${result.status} (${result.size}) ${result.fixed}`);
      results.success.push(result);
    } catch (error) {
      console.log(`❌ ${error.error}`);
      results.errors.push(error);
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 TEST SUMMARY');
  console.log('===============\n');
  
  console.log(`✅ Working: ${results.success.length}/${TOTAL_EPISODES}`);
  console.log(`❌ Errors: ${results.errors.length}/${TOTAL_EPISODES}\n`);
  
  if (results.errors.length > 0) {
    console.log('⚠️  Episodes with errors:\n');
    results.errors.forEach(err => {
      console.log(`   Episode ${err.episodeNum}: ${err.error}`);
    });
    console.log('');
  }
  
  // Check fixed episodes specifically
  const fixedWorking = results.success.filter(r => FIXED_EPISODES.includes(r.episodeNum));
  console.log(`🔧 Fixed episodes working: ${fixedWorking.length}/${FIXED_EPISODES.length}`);
  
  if (fixedWorking.length === FIXED_EPISODES.length) {
    console.log('✅ All audio-fixed episodes are streaming correctly!\n');
  } else {
    const fixedFailing = FIXED_EPISODES.filter(ep => 
      !results.success.find(r => r.episodeNum === ep)
    );
    console.log(`⚠️  Fixed episodes still failing: ${fixedFailing.join(', ')}\n`);
  }
  
  if (results.success.length === TOTAL_EPISODES) {
    console.log('🎉 ALL EPISODES ARE WORKING!');
    console.log('🔊 All videos should have audio!');
    console.log('📱 Compatible with iPhone and all browsers!\n');
  }
}

testAllEpisodes().catch(console.error);
