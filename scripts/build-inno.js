const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔨 Building Inno Setup installer...');

// Check if Inno Setup is available
const innoSetupPath = 'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe';
if (!fs.existsSync(innoSetupPath)) {
  console.error('❌ Inno Setup not found at expected location.');
  console.error('Download from: https://jrsoftware.org/isinfo.php');
  process.exit(1);
}

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = packageJson.version;

// Paths
const innoScript = path.join(__dirname, '..', 'build', 'installer.iss');
const outputDir = path.join(__dirname, '..', 'dist');
const unpackedDir = path.join(outputDir, 'win-unpacked');

// Check if unpacked directory exists
if (!fs.existsSync(unpackedDir)) {
  console.error('❌ Unpacked directory not found. Please run electron-builder first.');
  process.exit(1);
}

// Build Inno Setup installer
try {
  const command = `"${innoSetupPath}" /DVersion=${version} /DOutputDir="${outputDir}" "${innoScript}"`;
  console.log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit' });
  console.log('✅ Inno Setup installer built successfully!');
} catch (error) {
  console.error('❌ Failed to build Inno Setup installer:', error.message);
  process.exit(1);
} 