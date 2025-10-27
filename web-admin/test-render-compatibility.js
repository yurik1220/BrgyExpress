#!/usr/bin/env node

/**
 * Test script to verify Render.com compatibility
 * Checks if the build output is ready for Render deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing Render.com compatibility...\n');

// Test 1: Check if build directory exists
console.log('📁 Checking build directory:');
const buildDir = path.join(__dirname, 'build');
if (fs.existsSync(buildDir)) {
  console.log('✅ Build directory exists');
} else {
  console.log('❌ Build directory not found - run "npm run build" first');
  process.exit(1);
}

// Test 2: Check critical files in build directory
console.log('\n📄 Checking critical files in build directory:');
const criticalFiles = [
  'sw.js',
  'offline.html',
  'index.html',
  'static/css',
  'static/js'
];

criticalFiles.forEach(file => {
  const filePath = path.join(buildDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - Missing`);
  }
});

// Test 3: Check service worker content
console.log('\n🔧 Checking service worker:');
const swPath = path.join(buildDir, 'sw.js');
if (fs.existsSync(swPath)) {
  const swContent = fs.readFileSync(swPath, 'utf8');
  
  if (swContent.includes('CACHE_NAME')) {
    console.log('✅ Service worker has cache configuration');
  } else {
    console.log('❌ Service worker missing cache configuration');
  }
  
  if (swContent.includes('install')) {
    console.log('✅ Service worker has install event');
  } else {
    console.log('❌ Service worker missing install event');
  }
  
  if (swContent.includes('fetch')) {
    console.log('✅ Service worker has fetch event');
  } else {
    console.log('❌ Service worker missing fetch event');
  }
} else {
  console.log('❌ Service worker not found');
}

// Test 4: Check offline page
console.log('\n📱 Checking offline page:');
const offlinePath = path.join(buildDir, 'offline.html');
if (fs.existsSync(offlinePath)) {
  const offlineContent = fs.readFileSync(offlinePath, 'utf8');
  
  if (offlineContent.includes('<!DOCTYPE html>')) {
    console.log('✅ Offline page has proper HTML structure');
  } else {
    console.log('❌ Offline page missing HTML structure');
  }
  
  if (offlineContent.includes('navigator.onLine')) {
    console.log('✅ Offline page has connection detection');
  } else {
    console.log('❌ Offline page missing connection detection');
  }
} else {
  console.log('❌ Offline page not found');
}

// Test 5: Check index.html for service worker registration
console.log('\n🌐 Checking index.html:');
const indexPath = path.join(buildDir, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  if (indexContent.includes('serviceWorker')) {
    console.log('✅ Index.html has service worker registration');
  } else {
    console.log('❌ Index.html missing service worker registration');
  }
  
  if (indexContent.includes('sw.js')) {
    console.log('✅ Index.html references service worker file');
  } else {
    console.log('❌ Index.html missing service worker reference');
  }
} else {
  console.log('❌ Index.html not found');
}

// Test 6: Check static assets
console.log('\n📦 Checking static assets:');
const staticDir = path.join(buildDir, 'static');
if (fs.existsSync(staticDir)) {
  const staticFiles = fs.readdirSync(staticDir, { recursive: true });
  console.log(`✅ Static directory contains ${staticFiles.length} files`);
  
  const hasCSS = staticFiles.some(file => file.endsWith('.css'));
  const hasJS = staticFiles.some(file => file.endsWith('.js'));
  
  if (hasCSS) {
    console.log('✅ CSS files found');
  } else {
    console.log('❌ No CSS files found');
  }
  
  if (hasJS) {
    console.log('✅ JS files found');
  } else {
    console.log('❌ No JS files found');
  }
} else {
  console.log('❌ Static directory not found');
}

// Test 7: Check render.yaml
console.log('\n⚙️ Checking Render configuration:');
const renderYamlPath = path.join(__dirname, 'render.yaml');
if (fs.existsSync(renderYamlPath)) {
  console.log('✅ render.yaml found');
  
  const yamlContent = fs.readFileSync(renderYamlPath, 'utf8');
  if (yamlContent.includes('npm run build')) {
    console.log('✅ render.yaml has correct build command');
  } else {
    console.log('❌ render.yaml missing build command');
  }
  
  if (yamlContent.includes('staticPublishPath: ./build')) {
    console.log('✅ render.yaml has correct publish path');
  } else {
    console.log('❌ render.yaml missing publish path');
  }
} else {
  console.log('⚠️ render.yaml not found (optional)');
}

// Test 8: Check _headers file
console.log('\n📋 Checking headers configuration:');
const headersPath = path.join(__dirname, 'public', '_headers');
if (fs.existsSync(headersPath)) {
  console.log('✅ _headers file found');
  
  const headersContent = fs.readFileSync(headersPath, 'utf8');
  if (headersContent.includes('Service-Worker-Allowed')) {
    console.log('✅ Headers include service worker configuration');
  } else {
    console.log('❌ Headers missing service worker configuration');
  }
} else {
  console.log('⚠️ _headers file not found (optional)');
}

console.log('\n📊 Render Compatibility Summary:');
console.log('================================');

const allTestsPassed = fs.existsSync(buildDir) && 
                      fs.existsSync(path.join(buildDir, 'sw.js')) &&
                      fs.existsSync(path.join(buildDir, 'offline.html')) &&
                      fs.existsSync(path.join(buildDir, 'index.html'));

if (allTestsPassed) {
  console.log('🎉 Your app is ready for Render deployment!');
  console.log('\n🚀 Next steps:');
  console.log('1. Push your code to GitHub');
  console.log('2. Connect repository to Render');
  console.log('3. Deploy with the configured settings');
  console.log('4. Test offline functionality on the live site');
} else {
  console.log('❌ Some issues found - please fix them before deploying');
  console.log('\n🔧 Common fixes:');
  console.log('1. Run "npm run build" to create build directory');
  console.log('2. Check that all files are properly copied');
  console.log('3. Verify service worker registration in index.html');
}

console.log('\n📚 Documentation:');
console.log('- See RENDER_DEPLOYMENT.md for detailed deployment guide');
console.log('- Check OFFLINE_SETUP.md for offline functionality details');


