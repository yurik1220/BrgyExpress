import React, { useState, useEffect } from 'react';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection status periodically
    const checkConnection = async () => {
      try {
        // Try to fetch a small resource to verify connection
        await fetch('/favicon.ico', { 
          method: 'HEAD', 
          cache: 'no-cache',
          mode: 'no-cors'
        });
        if (!isOnline) {
          setIsOnline(true);
          setShowIndicator(false);
        }
      } catch (error) {
        if (isOnline) {
          setIsOnline(false);
          setShowIndicator(true);
        }
      }
    };

    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  // Show indicator when offline
  if (!showIndicator && isOnline) {
    return null;
  }

  return (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
      <div className="offline-content">
        <div className="offline-icon">
          {isOnline ? '🟢' : '🔴'}
        </div>
        <div className="offline-text">
          {isOnline ? 'Back Online' : 'Offline Mode'}
        </div>
        <div className="offline-message">
          {isOnline 
            ? 'Your connection has been restored.' 
            : 'You are currently offline. Some features may be limited.'
          }
        </div>
        {!isOnline && (
          <button 
            className="offline-retry-btn"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;
