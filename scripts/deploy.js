#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`ERROR: ${message}`, 'red');
  process.exit(1);
}

function success(message) {
  log(`SUCCESS: ${message}`, 'green');
}

function info(message) {
  log(`INFO: ${message}`, 'blue');
}

function warning(message) {
  log(`WARNING: ${message}`, 'yellow');
}

// Read package.json
function readPackageJson() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  return JSON.parse(packageContent);
}

// Write package.json
function writePackageJson(packageJson) {
  const packagePath = path.join(__dirname, '..', 'package.json');
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
}

// Bump version
function bumpVersion(type = 'patch') {
  const packageJson = readPackageJson();
  const currentVersion = packageJson.version;
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  packageJson.version = newVersion;
  writePackageJson(packageJson);
  
  return newVersion;
}

// Check if git is clean
function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      error('Git working directory is not clean. Please commit or stash your changes.');
    }
  } catch (err) {
    error('Failed to check git status. Make sure you are in a git repository.');
  }
}

// Create git tag
function createGitTag(version) {
  try {
    execSync(`git tag v${version}`, { stdio: 'inherit' });
    success(`Created git tag v${version}`);
  } catch (err) {
    error('Failed to create git tag');
  }
}

// Push to remote
function pushToRemote() {
  try {
    execSync('git push origin main', { stdio: 'inherit' });
    execSync('git push --tags', { stdio: 'inherit' });
    success('Pushed changes and tags to remote');
  } catch (err) {
    error('Failed to push to remote');
  }
}

// Build application
function buildApp() {
  try {
    info('Building application...');
    execSync('npm run build', { stdio: 'inherit' });
    success('Application built successfully');
  } catch (err) {
    error('Failed to build application');
  }
}

// Create distribution
function createDistribution() {
  try {
    info('Creating distribution...');
    execSync('npm run dist:win', { stdio: 'inherit' });
    success('Distribution created successfully');
  } catch (err) {
    error('Failed to create distribution');
  }
}

// Main deployment function
function deploy(versionType = 'patch') {
  log('🚀 Starting deployment process...', 'cyan');
  
  // Check prerequisites
  info('Checking prerequisites...');
  checkGitStatus();
  
  // Bump version
  info('Bumping version...');
  const newVersion = bumpVersion(versionType);
  success(`Version bumped to ${newVersion}`);
  
  // Build application
  buildApp();
  
  // Create distribution
  createDistribution();
  
  // Commit changes
  try {
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "Release v${newVersion}"`, { stdio: 'inherit' });
    success('Changes committed');
  } catch (err) {
    error('Failed to commit changes');
  }
  
  // Create tag
  createGitTag(newVersion);
  
  // Push to remote
  pushToRemote();
  
  log('🎉 Deployment completed successfully!', 'green');
  log(`📦 Version ${newVersion} has been released`, 'cyan');
  log('🔗 Check GitHub Actions for build progress', 'blue');
}

// Parse command line arguments
const args = process.argv.slice(2);
const versionType = args[0] || 'patch';

if (!['major', 'minor', 'patch'].includes(versionType)) {
  error('Invalid version type. Use: major, minor, or patch');
}

// Run deployment
deploy(versionType); 