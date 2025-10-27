import React, { useState, useEffect } from 'react';

const Watermark = () => {
  const [loginTime, setLoginTime] = useState(null);
  const [adminUsername, setAdminUsername] = useState('admin');

  useEffect(() => {
    const updateWatermark = () => {
      const username = localStorage.getItem('admin_username') || 'admin';
      const loginTimestamp = localStorage.getItem('admin_login_time');

      setAdminUsername(username);

      if (loginTimestamp) {
        setLoginTime(new Date(loginTimestamp));
      } else {
        const now = new Date();
        setLoginTime(now);
        localStorage.setItem('admin_login_time', now.toISOString());
      }
    };

    // Initial load
    updateWatermark();

    // Listen for storage changes (when user logs in/out in other tabs or on re-login)
    const handleStorageChange = (e) => {
      if (e.key === 'admin_login_time' || e.key === 'admin_username') {
        updateWatermark();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    const handleAdminLogin = () => {
      updateWatermark();
    };

    window.addEventListener('adminLogin', handleAdminLogin);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('adminLogin', handleAdminLogin);
    };
  }, []);

  const formatManilaTime = (date) => {
    if (!date) return { timeString: '', dateString: '' };

    const manilaTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const timeString = manilaTime.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });
    const dateString = manilaTime.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
    return { timeString, dateString };
  };

  const { timeString, dateString } = formatManilaTime(loginTime);
  const watermarkText = `${adminUsername} | ${dateString} ${timeString} * `;

  if (!loginTime) return null;

  // Create a continuous string with the pattern repeated many times
  const continuousText = Array.from({ length: 200 }).map(() => watermarkText).join('');

  return (
    <div
      className="dashboard-watermark"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 9999,
        width: '100vw',
        height: '100vh',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-200vh',
          left: '-200vw',
          width: '600vw',
          height: '600vh',
          transform: 'rotate(-45deg)',
          transformOrigin: 'center center',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {Array.from({ length: 300 }).map((_, i) => (
          <div 
            key={i} 
            style={{ 
              width: '100%',
              lineHeight: '80px',
              fontSize: '18px',
              color: 'rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
              overflow: 'visible'
            }}
          >
            {continuousText}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Watermark;