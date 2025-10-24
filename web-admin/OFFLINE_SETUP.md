# Offline Support for BrgyExpress Admin

This document explains the offline functionality implemented in the web-admin application using Service Workers.

## 🚀 Features

- **Service Worker Caching**: Automatically caches static assets and API responses
- **Offline Fallback**: Shows a custom offline page when network is unavailable
- **Visual Indicators**: Displays offline status banner in the admin UI
- **Production Only**: Service worker only runs in production builds
- **Framework Agnostic**: Works with the current React setup

## 📁 Files Added

### Service Worker Files
- `public/sw.js` - Main service worker implementation
- `public/offline.html` - Offline fallback page
- `src/lib/serviceWorker.js` - Service worker registration utility

### React Components
- `src/components/OfflineIndicator.js` - Offline status indicator component
- `src/components/OfflineIndicator.css` - Styles for offline indicator

### Build Scripts
- `scripts/build-with-sw.js` - Post-build configuration script

## 🔧 How It Works

### 1. Service Worker Registration
- Only registers in production builds (`NODE_ENV === 'production'`)
- Automatically registers when the app loads
- Handles updates and cache management

### 2. Caching Strategy
- **Static Assets**: Cache-first strategy for JS, CSS, images
- **API Calls**: Network-first strategy with cache fallback
- **HTML Pages**: Network-first with offline page fallback

### 3. Offline Detection
- Uses `navigator.onLine` and periodic connection checks
- Shows visual indicator when offline
- Auto-hides indicator when back online

## 🛠️ Usage

### Development
```bash
npm start
# Service worker is NOT active in development
```

### Production Build
```bash
npm run build
# or
npm run build:sw
# Service worker is configured and active
```

### Testing Offline Functionality
1. Build the app: `npm run build`
2. Serve the build directory: `npx serve -s build`
3. Open Developer Tools (F12)
4. Go to Network tab
5. Check "Offline" checkbox
6. Refresh the page - you should see the offline page

## 📋 Cached Resources

### Static Assets (Cache-First)
- `/index.html`
- `/static/css/main.css`
- `/static/js/main.js`
- `/manifest.json`
- `/favicon.ico`
- `/logo192.png`
- `/logo512.png`
- `/images/bagong-pilipinas.png`
- `/images/bx-logo.png`

### API Endpoints (Network-First)
- `/api/requests/*`
- `/api/incidents/*`
- `/api/analytics/*`
- `/api/admin/*`
- `/api/audit/*`

## 🎨 Offline Indicator

The offline indicator appears at the top of the screen when:
- Network connection is lost
- Connection is restored (shows briefly)

### Features
- **Visual Status**: Red for offline, green for online
- **Auto-hide**: Disappears after 3 seconds when back online
- **Retry Button**: Allows manual refresh when offline
- **Responsive**: Adapts to mobile screens

## 🔄 Cache Management

### Automatic Cache Updates
- Service worker updates automatically when new version is deployed
- Old caches are cleaned up on activation
- Cache version is included in cache name for easy management

### Manual Cache Control
```javascript
// Check if service worker is active
import { isServiceWorkerActive } from './lib/serviceWorker';

if (isServiceWorkerActive()) {
  console.log('Service worker is running');
}

// Send message to service worker
import { sendMessageToServiceWorker } from './lib/serviceWorker';

sendMessageToServiceWorker({
  type: 'CACHE_UPDATE',
  payload: { key: 'some-data' }
});
```

## 🚨 Troubleshooting

### Service Worker Not Registering
1. Check if running in production mode
2. Verify HTTPS is being used (required for service workers)
3. Check browser console for errors

### Cache Not Working
1. Clear browser cache and reload
2. Check if service worker is active in DevTools > Application > Service Workers
3. Verify cache names match in DevTools > Application > Storage

### Offline Page Not Showing
1. Ensure `offline.html` is in the build directory
2. Check if service worker is properly registered
3. Verify network is actually offline

## 📊 Browser Support

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support (iOS 11.3+)
- **Edge**: Full support

## 🔒 Security Considerations

- Service worker only runs on HTTPS in production
- Cached data is stored locally and not transmitted
- API responses are cached but not sensitive data
- Offline page doesn't contain sensitive information

## 🚀 Deployment

### Render.com
1. Build the app: `npm run build`
2. Deploy the `build` directory
3. Ensure HTTPS is enabled
4. Service worker will be available at `/sw.js`

### Other Platforms
1. Build the app: `npm run build`
2. Deploy the `build` directory
3. Ensure HTTPS is enabled
4. Verify `/sw.js` and `/offline.html` are accessible

## 📈 Performance Impact

- **Initial Load**: Slightly slower due to service worker registration
- **Subsequent Loads**: Faster due to caching
- **Offline Experience**: Significantly improved
- **Cache Size**: Minimal impact on storage

## 🔮 Future Enhancements

- Background sync for offline actions
- Push notifications
- Advanced cache strategies
- Offline form submission queue
- Cache size management

## 📚 Resources

- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Offline Web Applications](https://developers.google.com/web/fundamentals/primers/service-workers)

## 🆘 Support

For issues with offline functionality:
1. Check browser console for errors
2. Verify service worker registration in DevTools
3. Test with different network conditions
4. Check cache status in DevTools > Application > Storage
