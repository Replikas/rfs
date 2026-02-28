const fs = require('fs');
const data = JSON.parse(fs.readFileSync('local-audio-report.json'));

const incompatible = data.filter(e => e.codec && e.codec !== 'aac');

console.log(`\n🔊 Episodes with non-AAC audio: ${incompatible.length}/81\n`);

const byCodec = {};
incompatible.forEach(e => {
  if (!byCodec[e.codec]) byCodec[e.codec] = [];
  byCodec[e.codec].push(e.episodeNum);
});

Object.keys(byCodec).forEach(codec => {
  console.log(`${codec.toUpperCase()}: ${byCodec[codec].length} episodes`);
  console.log(`  Episodes: ${byCodec[codec].join(', ')}`);
  console.log('');
});

console.log('⚠️  These episodes will have NO AUDIO in most browsers!');
console.log('✅ Solution: Convert to AAC audio\n');
