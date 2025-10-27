#!/usr/bin/env node

/**
 * Build script that ensures Service Worker is properly configured
 * This script runs after the standard React build process
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Configuring Service Worker for production...');

const buildDir = path.join(__dirname, '../build');
const publicDir = path.join(__dirname, '../public');

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Copy service worker to build directory
const swSource = path.join(publicDir, 'sw.js');
const swDest = path.join(buildDir, 'sw.js');

if (fs.existsSync(swSource)) {
  fs.copyFileSync(swSource, swDest);
  console.log('✅ Service worker copied to build directory');
} else {
  console.error('❌ Service worker not found in public directory');
  process.exit(1);
}

// Copy offline.html to build directory
const offlineSource = path.join(publicDir, 'offline.html');
const offlineDest = path.join(buildDir, 'offline.html');

if (fs.existsSync(offlineSource)) {
  fs.copyFileSync(offlineSource, offlineDest);
  console.log('✅ Offline page copied to build directory');
} else {
  console.error('❌ Offline page not found in public directory');
  process.exit(1);
}

// Update index.html to include service worker registration
const indexPath = path.join(buildDir, 'index.html');
if (fs.existsSync(indexPath)) {
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // Add service worker registration script before closing body tag
  const swScript = `
    <script>
      // Service Worker Registration
      if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        window.addEventListener('load', function() {
          navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
              console.log('SW registered: ', registration);
            })
            .catch(function(registrationError) {
              console.log('SW registration failed: ', registrationError);
            });
        });
      }
    </script>`;
  
  // Insert before closing body tag
  indexContent = indexContent.replace('</body>', swScript + '\n</body>');
  
  fs.writeFileSync(indexPath, indexContent);
  console.log('✅ Service worker registration added to index.html');
} else {
  console.error('❌ index.html not found in build directory');
  process.exit(1);
}

// Create a simple offline test page
const offlineTestContent = `<!DOCTYPE html>
<html>
<head>
    <title>Offline Test - BrgyExpress Admin</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .test-section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .status { font-weight: bold; }
        .online { color: green; }
        .offline { color: red; }
    </style>
</head>
<body>
    <h1>Service Worker Test Page</h1>
    
    <div class="test-section">
        <h3>Connection Status</h3>
        <p>Status: <span id="status" class="status">Checking...</span></p>
        <p>Service Worker: <span id="sw-status">Checking...</span></p>
    </div>
    
    <div class="test-section">
        <h3>Cache Test</h3>
        <button onclick="testCache()">Test Cache</button>
        <div id="cache-result"></div>
    </div>
    
    <div class="test-section">
        <h3>Offline Test</h3>
        <p>To test offline functionality:</p>
        <ol>
            <li>Open Developer Tools (F12)</li>
            <li>Go to Network tab</li>
            <li>Check "Offline" checkbox</li>
            <li>Refresh the page</li>
            <li>You should see the offline page</li>
        </ol>
    </div>
    
    <script>
        // Check connection status
        function updateStatus() {
            const statusEl = document.getElementById('status');
            const swStatusEl = document.getElementById('sw-status');
            
            if (navigator.onLine) {
                statusEl.textContent = 'Online';
                statusEl.className = 'status online';
            } else {
                statusEl.textContent = 'Offline';
                statusEl.className = 'status offline';
            }
            
            // Check service worker
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                    swStatusEl.textContent = 'Active';
                    swStatusEl.className = 'status online';
                }).catch(() => {
                    swStatusEl.textContent = 'Not Active';
                    swStatusEl.className = 'status offline';
                });
            } else {
                swStatusEl.textContent = 'Not Supported';
                swStatusEl.className = 'status offline';
            }
        }
        
        // Test cache
        async function testCache() {
            const resultEl = document.getElementById('cache-result');
            resultEl.innerHTML = 'Testing cache...';
            
            try {
                const cache = await caches.open('brgyexpress-admin-v1.0.0');
                const keys = await cache.keys();
                resultEl.innerHTML = \`Cache contains \${keys.length} items<br>\`;
                
                // Test fetching from cache
                const response = await cache.match('/');
                if (response) {
                    resultEl.innerHTML += '✅ Main page cached successfully';
                } else {
                    resultEl.innerHTML += '❌ Main page not found in cache';
                }
            } catch (error) {
                resultEl.innerHTML = \`❌ Cache test failed: \${error.message}\`;
            }
        }
        
        // Update status on load and connection changes
        updateStatus();
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(buildDir, 'sw-test.html'), offlineTestContent);
console.log('✅ Offline test page created');

console.log('🎉 Service Worker build configuration complete!');
console.log('📁 Build directory:', buildDir);
console.log('🔧 Files configured:');
console.log('  - sw.js (Service Worker)');
console.log('  - offline.html (Offline fallback)');
console.log('  - index.html (Updated with SW registration)');
console.log('  - sw-test.html (Test page)');
console.log('');
console.log('🚀 Ready for deployment!');


