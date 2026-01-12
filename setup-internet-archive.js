const readline = require('readline');
const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n🏛️  Internet Archive Setup');
console.log('=========================\n');

console.log('Internet Archive is 100% FREE with:');
console.log('✅ 250GB free storage (way more than needed)');
console.log('✅ Unlimited bandwidth');
console.log('✅ Works on iPhone/Android/all browsers');
console.log('✅ Auto-transcoding for web playback');
console.log('✅ No ads, no limits!\n');

console.log('Step 1: Create a free account');
console.log('Go to: https://archive.org/account/signup\n');

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function checkPython() {
  try {
    const { stdout } = await execPromise('python --version');
    console.log(`✅ Python found: ${stdout.trim()}\n`);
    return true;
  } catch (error) {
    try {
      const { stdout } = await execPromise('python3 --version');
      console.log(`✅ Python found: ${stdout.trim()}\n`);
      return true;
    } catch (error2) {
      return false;
    }
  }
}

async function installIA() {
  console.log('📦 Installing Internet Archive CLI...\n');
  
  try {
    // Try pip
    await execPromise('pip install internetarchive');
    console.log('✅ Installed via pip!\n');
    return true;
  } catch (error) {
    try {
      // Try pip3
      await execPromise('pip3 install internetarchive');
      console.log('✅ Installed via pip3!\n');
      return true;
    } catch (error2) {
      console.log('❌ Failed to install:', error2.message);
      return false;
    }
  }
}

async function configureIA(email, password) {
  console.log('\n🔐 Configuring credentials...\n');
  
  try {
    await execPromise(`ia configure --username="${email}" --password="${password}"`);
    console.log('✅ Credentials configured!\n');
    return true;
  } catch (error) {
    console.log('❌ Failed:', error.message);
    return false;
  }
}

async function main() {
  // Check Python
  const hasPython = await checkPython();
  
  if (!hasPython) {
    console.log('❌ Python not found!\n');
    console.log('Please install Python from: https://www.python.org/downloads/\n');
    console.log('Then run this script again.\n');
    rl.close();
    return;
  }
  
  // Check if ia CLI is installed
  try {
    await execPromise('ia --version');
    console.log('✅ Internet Archive CLI already installed!\n');
  } catch (error) {
    console.log('⚠️  Internet Archive CLI not found. Installing...\n');
    const installed = await installIA();
    
    if (!installed) {
      console.log('\n❌ Installation failed. Please install manually:');
      console.log('   pip install internetarchive\n');
      rl.close();
      return;
    }
  }
  
  // Get credentials
  console.log('Enter your Internet Archive credentials:\n');
  
  const email = await askQuestion('Email: ');
  const password = await askQuestion('Password: ');
  
  // Configure
  const configured = await configureIA(email.trim(), password.trim());
  
  if (configured) {
    console.log('🎉 Setup complete!\n');
    console.log('🚀 Now run: node upload-to-internet-archive.js\n');
    console.log('This will upload all 81 episodes to Internet Archive (FREE!)');
    console.log('⏱️  Upload will take 2-4 hours.\n');
  }
  
  rl.close();
}

main().catch(error => {
  console.error('Error:', error);
  rl.close();
});
