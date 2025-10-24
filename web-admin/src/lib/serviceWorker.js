// Service Worker Registration Utility
// Only registers in production builds

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

const isProduction = process.env.NODE_ENV === 'production';

export function register() {
  // Only register in production
  if (!isProduction) {
    console.log('[SW] Service worker registration skipped in development');
    return;
  }

  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Service worker won't work if PUBLIC_URL is on a different origin
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        // Running on localhost, check if service worker exists
        checkValidServiceWorker(swUrl);
      } else {
        // Not localhost, register service worker
        registerValidSW(swUrl);
      }
    });
  }
}

function registerValidSW(swUrl) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[SW] Service worker registered successfully:', registration);
      
      // Check for updates
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content is available, show update notification
              console.log('[SW] New content is available; please refresh.');
              showUpdateNotification();
            } else {
              // Content is cached for offline use
              console.log('[SW] Content is cached for offline use.');
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('[SW] Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl) {
  // Check if the service worker can be found
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists and that we really are getting a JS file
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker found, proceed normally
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('[SW] No internet connection found. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
        console.log('[SW] Service worker unregistered');
      })
      .catch((error) => {
        console.error('[SW] Error unregistering service worker:', error);
      });
  }
}

// Show update notification
function showUpdateNotification() {
  // Create a simple notification
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #667eea;
    color: white;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    max-width: 300px;
  `;
  
  notification.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">Update Available</div>
    <div style="font-size: 14px; margin-bottom: 12px;">A new version is available. Refresh to update.</div>
    <button onclick="window.location.reload()" style="
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    ">Refresh</button>
    <button onclick="this.parentElement.remove()" style="
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-left: 8px;
    ">Dismiss</button>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 10000);
}

// Service Worker message handling
export function setupServiceWorkerMessaging() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW] Message from service worker:', event.data);
      
      // Handle different message types
      switch (event.data.type) {
        case 'CACHE_UPDATED':
          console.log('[SW] Cache updated:', event.data.payload);
          break;
        case 'OFFLINE_ACTION_QUEUED':
          console.log('[SW] Offline action queued:', event.data.payload);
          break;
        default:
          console.log('[SW] Unknown message type:', event.data.type);
      }
    });
  }
}

// Send message to service worker
export function sendMessageToServiceWorker(message) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
}

// Check if service worker is supported and active
export function isServiceWorkerSupported() {
  return 'serviceWorker' in navigator;
}

export function isServiceWorkerActive() {
  return navigator.serviceWorker.controller !== null;
}
