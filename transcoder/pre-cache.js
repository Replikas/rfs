const fetch = require('node-fetch');

const TRANSCODER_URL = 'https://transcodingrem-production.up.railway.app';
const TOTAL_EPISODES = 81;

async function preCacheEpisode(episodeId) {
  const url = `${TRANSCODER_URL}/hls/${episodeId}/playlist.m3u8`;
  
  console.log(`\n📺 Episode ${episodeId}/${TOTAL_EPISODES}`);
  console.log(`Requesting: ${url}`);
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(url);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (response.ok) {
      console.log(`✅ Cached in ${duration}s`);
      return { episodeId, success: true, duration };
    } else {
      console.log(`❌ Failed: ${response.status} ${response.statusText}`);
      return { episodeId, success: false, error: response.statusText };
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`❌ Error after ${duration}s: ${error.message}`);
    return { episodeId, success: false, error: error.message };
  }
}

async function preCacheAll() {
  console.log('🎬 RickFlix Episode Pre-Caching Tool');
  console.log('=====================================');
  console.log(`Target: ${TRANSCODER_URL}`);
  console.log(`Episodes: 1-${TOTAL_EPISODES}`);
  console.log('\nThis will take approximately 60-90 minutes.');
  console.log('You can leave this running in the background.\n');
  
  const results = [];
  const startTime = Date.now();
  
  // Process episodes one at a time (avoid overwhelming server)
  for (let episodeId = 1; episodeId <= TOTAL_EPISODES; episodeId++) {
    const result = await preCacheEpisode(episodeId);
    results.push(result);
    
    // Short delay between episodes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Summary
  const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log('\n\n🎉 PRE-CACHING COMPLETE!');
  console.log('=========================');
  console.log(`✅ Successful: ${successful}/${TOTAL_EPISODES}`);
  console.log(`❌ Failed: ${failed}/${TOTAL_EPISODES}`);
  console.log(`⏱️  Total time: ${totalTime} minutes`);
  
  if (failed > 0) {
    console.log('\n❌ Failed episodes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   Episode ${r.episodeId}: ${r.error}`);
    });
  }
  
  console.log('\n💡 All cached episodes will now load instantly on iPhone!');
}

// Run
preCacheAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
