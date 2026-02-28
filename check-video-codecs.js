const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execPromise = promisify(exec);
const FOLDER_PATH = 'C:\\Users\\User\\Desktop\\allseasons';

function findAllMP4s(dir) {
  let results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(findAllMP4s(fullPath));
    } else if (item.name.endsWith('.mp4')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function checkCodecs(filePath) {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of json "${filePath}"`,
      { timeout: 10000 }
    );
    
    const videoInfo = JSON.parse(stdout);
    const videoCodec = videoInfo.streams?.[0]?.codec_name || 'unknown';
    
    const { stdout: audioOut } = await execPromise(
      `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of json "${filePath}"`,
      { timeout: 10000 }
    );
    
    const audioInfo = JSON.parse(audioOut);
    const audioCodec = audioInfo.streams?.[0]?.codec_name || 'none';
    
    return { videoCodec, audioCodec };
    
  } catch (error) {
    return { videoCodec: 'error', audioCodec: 'error', error: error.message };
  }
}

async function main() {
  console.log('🎬 Checking Video Codecs for iPhone Compatibility');
  console.log('=================================================\n');
  
  const filePaths = findAllMP4s(FOLDER_PATH);
  const files = filePaths.map(fp => ({ name: path.basename(fp), fullPath: fp }));
  
  const episodeFiles = {};
  
  for (const file of files) {
    const fileName = file.name.toLowerCase();
    let match = fileName.match(/s(\d{2})e(\d{2})/i);
    
    if (match) {
      const season = parseInt(match[1]);
      const episode = parseInt(match[2]);
      
      let episodeNum = 0;
      if (season === 1) episodeNum = episode;
      else if (season === 2) episodeNum = 11 + episode;
      else if (season === 3) episodeNum = 21 + episode;
      else if (season === 4) episodeNum = 31 + episode;
      else if (season === 5) episodeNum = 41 + episode;
      else if (season === 6) episodeNum = 51 + episode;
      else if (season === 7) episodeNum = 61 + episode;
      else if (season === 8) episodeNum = 71 + episode;
      
      if (episodeNum > 0 && episodeNum <= 81) {
        episodeFiles[episodeNum] = file.fullPath;
      }
    }
  }
  
  console.log(`✅ Found ${Object.keys(episodeFiles).length} episodes\n`);
  
  const results = [];
  const needsReencoding = [];
  
  for (let i = 1; i <= 81; i++) {
    if (!episodeFiles[i]) {
      console.log(`⚠️  Episode ${i}: File not found`);
      continue;
    }
    
    const filePath = episodeFiles[i];
    const fileName = path.basename(filePath);
    
    console.log(`📺 Episode ${i}: ${fileName}`);
    
    const codecs = await checkCodecs(filePath);
    
    const videoOK = codecs.videoCodec === 'h264';
    const audioOK = codecs.audioCodec === 'aac';
    
    console.log(`   Video: ${codecs.videoCodec.toUpperCase()} ${videoOK ? '✅' : '❌'}`);
    console.log(`   Audio: ${codecs.audioCodec.toUpperCase()} ${audioOK ? '✅' : '❌'}`);
    
    if (!videoOK || !audioOK) {
      console.log(`   ⚠️  NEEDS RE-ENCODING for iPhone`);
      needsReencoding.push({
        episodeNum: i,
        fileName,
        videoCodec: codecs.videoCodec,
        audioCodec: codecs.audioCodec,
        needsVideoFix: !videoOK,
        needsAudioFix: !audioOK
      });
    } else {
      console.log(`   ✅ iPhone compatible`);
    }
    
    results.push({
      episodeNum: i,
      videoCodec: codecs.videoCodec,
      audioCodec: codecs.audioCodec,
      iphoneCompatible: videoOK && audioOK
    });
    
    console.log('');
  }
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('===========\n');
  
  const compatible = results.filter(r => r.iphoneCompatible).length;
  const incompatible = results.filter(r => !r.iphoneCompatible).length;
  
  console.log(`✅ iPhone compatible: ${compatible}/81`);
  console.log(`❌ Needs re-encoding: ${incompatible}/81\n`);
  
  if (needsReencoding.length > 0) {
    console.log('⚠️  Episodes that need re-encoding:\n');
    
    // Group by what needs fixing
    const videoOnly = needsReencoding.filter(e => e.needsVideoFix && !e.needsAudioFix);
    const audioOnly = needsReencoding.filter(e => !e.needsVideoFix && e.needsAudioFix);
    const both = needsReencoding.filter(e => e.needsVideoFix && e.needsAudioFix);
    
    if (videoOnly.length > 0) {
      console.log(`🎬 Video only (${videoOnly.length} episodes):`);
      const hevc = videoOnly.filter(e => e.videoCodec === 'hevc');
      if (hevc.length > 0) {
        console.log(`   HEVC → H.264: Episodes ${hevc.map(e => e.episodeNum).join(', ')}`);
      }
      console.log('');
    }
    
    if (audioOnly.length > 0) {
      console.log(`🔊 Audio only (${audioOnly.length} episodes):`);
      console.log(`   Episodes: ${audioOnly.map(e => e.episodeNum).join(', ')}`);
      console.log('');
    }
    
    if (both.length > 0) {
      console.log(`🎬🔊 Both video & audio (${both.length} episodes):`);
      console.log(`   Episodes: ${both.map(e => e.episodeNum).join(', ')}`);
      console.log('');
    }
  }
  
  // Save report
  const reportPath = path.join(__dirname, 'video-codec-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Report saved: ${reportPath}\n`);
  
  if (incompatible > 0) {
    console.log(`⏱️  Re-encoding time estimate: ~${Math.ceil(incompatible * 5)} minutes\n`);
  }
}

main().catch(console.error);
