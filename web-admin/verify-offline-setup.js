#!/usr/bin/env node

/**
 * Verification script for offline setup
 * Checks if all required files are in place
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying offline setup...\n');

const requiredFiles = [
  'public/sw.js',
  'public/offline.html',
  'src/components/OfflineIndicator.js',
  'src/components/OfflineIndicator.css',
  'src/lib/serviceWorker.js',
  'scripts/build-with-sw.js'
];

let allFilesExist = true;

console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesExist = false;
  }
});

console.log('\n📋 Checking package.json scripts:');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (packageJson.scripts.build && packageJson.scripts.build.includes('build-with-sw.js')) {
    console.log('✅ Build script configured');
  } else {
    console.log('❌ Build script not configured');
    allFilesExist = false;
  }
  
  if (packageJson.scripts['build:sw']) {
    console.log('✅ Build:sw script configured');
  } else {
    console.log('❌ Build:sw script not configured');
    allFilesExist = false;
  }
} else {
  console.log('❌ package.json not found');
  allFilesExist = false;
}

console.log('\n🔧 Checking app.js integration:');
const appJsPath = path.join(__dirname, 'src/app.js');
if (fs.existsSync(appJsPath)) {
  const appContent = fs.readFileSync(appJsPath, 'utf8');
  
  if (appContent.includes('OfflineIndicator')) {
    console.log('✅ OfflineIndicator imported');
  } else {
    console.log('❌ OfflineIndicator not imported');
    allFilesExist = false;
  }
  
  if (appContent.includes('serviceWorker')) {
    console.log('✅ Service worker utilities imported');
  } else {
    console.log('❌ Service worker utilities not imported');
    allFilesExist = false;
  }
  
  if (appContent.includes('<OfflineIndicator />')) {
    console.log('✅ OfflineIndicator component rendered');
  } else {
    console.log('❌ OfflineIndicator component not rendered');
    allFilesExist = false;
  }
} else {
  console.log('❌ app.js not found');
  allFilesExist = false;
}

console.log('\n📊 Summary:');
if (allFilesExist) {
  console.log('🎉 All offline setup files are in place!');
  console.log('\n🚀 Next steps:');
  console.log('1. Run: npm run build');
  console.log('2. Test offline functionality');
  console.log('3. Deploy to production');
} else {
  console.log('❌ Some files are missing or not configured properly');
  console.log('Please check the missing items above and fix them.');
}

console.log('\n📚 Documentation:');
console.log('- See OFFLINE_SETUP.md for detailed usage instructions');
console.log('- Check public/sw.js for service worker implementation');
console.log('- Review src/components/OfflineIndicator.js for UI component');


