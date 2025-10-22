// electron/browserNotificationInjector.js
// This script will be injected into the browser windows to show notifications

const notificationScript = `
(function() {
  // Check if already injected
  if (window.electronDownloadHandlers && window.electronDownloadHandlers._initialized) {
    console.log('Notification system already initialized, skipping...');
    return;
  }

  // Create notification container
  const createNotificationContainer = () => {
    // Remove existing container if any
    const existing = document.getElementById('electron-download-notifications');
    if (existing) {
      existing.remove();
    }
    
    const container = document.createElement('div');
    container.id = 'electron-download-notifications';
    container.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 999999;
      pointer-events: none;
    \`;
    document.body.appendChild(container);
    return container;
  };

  // Create a single notification element
  const createNotification = (data) => {
    const notification = document.createElement('div');
    notification.id = 'notification-' + (data.downloadId || Date.now());
    notification.style.cssText = \`
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      margin-bottom: 10px;
      padding: 16px;
      pointer-events: auto;
      transition: all 0.3s ease;
      transform: translateX(420px);
      animation: slideIn 0.3s ease forwards;
    \`;

    const getIcon = (status) => {
      switch(status) {
        case 'downloading': return '⬇️';
        case 'completed': return '✅';
        case 'error': return '❌';
        case 'info': return 'ℹ️';
        default: return '📄';
      }
    };

    const getColor = (status) => {
      switch(status) {
        case 'downloading': return '#1976d2';
        case 'completed': return '#4caf50';
        case 'error': return '#f44336';
        case 'info': return '#2196f3';
        default: return '#757575';
      }
    };

    notification.innerHTML = \`
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 24px; line-height: 1;">\${getIcon(data.status || 'downloading')}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
            \${data.documentType || 'Download'}
          </div>
          <div style="color: #666; font-size: 14px; margin-bottom: 8px;">
            \${data.message || 'Processing...'}
          </div>
          \${data.progress !== undefined && data.status === 'downloading' ? \`
            <div style="margin-top: 8px;">
              <div style="background: #e0e0e0; height: 6px; border-radius: 3px; overflow: hidden;">
                <div style="background: \${getColor(data.status)}; height: 100%; width: \${data.progress}%; transition: width 0.3s ease;"></div>
              </div>
              <div style="font-size: 12px; color: #999; margin-top: 4px;">\${data.progress}% complete</div>
            </div>
          \` : ''}
          \${data.fileName ? \`
            <div style="font-size: 12px; color: #999; margin-top: 4px; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              \${data.fileName}
            </div>
          \` : ''}
        </div>
        <button onclick="removeNotification('\${notification.id}')" style="
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #999;
          padding: 4px;
          line-height: 1;
          transition: color 0.2s;
        " onmouseover="this.style.color='#333'" onmouseout="this.style.color='#999'">
          ×
        </button>
      </div>
    \`;

    return notification;
  };

  // Animation styles
  const addStyles = () => {
    // Remove existing styles if any
    const existingStyle = document.getElementById('electron-notification-styles');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    const style = document.createElement('style');
    style.id = 'electron-notification-styles';
    style.textContent = \`
      @keyframes slideIn {
        from { transform: translateX(420px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(420px); opacity: 0; }
      }
    \`;
    document.head.appendChild(style);
  };

  // Add styles
  addStyles();

  // Remove notification function
  window.removeNotification = (id) => {
    const notification = document.getElementById(id);
    if (notification) {
      notification.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => notification.remove(), 300);
    }
  };

  // Get or create container
  let container = createNotificationContainer();

  // Re-create container if body changes (for SPAs)
  const observer = new MutationObserver(() => {
    if (!document.getElementById('electron-download-notifications')) {
      console.log('Notification container removed, recreating...');
      container = createNotificationContainer();
      addStyles();
    }
  });
  
  observer.observe(document.body, { childList: true });

  // Listen for download events from Electron
  window.electronDownloadHandlers = {
    _initialized: true,
    
    onDownloadStarted: (data) => {
      console.log('Download started:', data);
      const notification = createNotification({
        ...data,
        status: 'downloading',
        progress: 0
      });
      container.appendChild(notification);

      // Auto remove after 30 seconds if still downloading
      setTimeout(() => {
        if (document.getElementById(notification.id)) {
          removeNotification(notification.id);
        }
      }, 30000);
    },

    onDownloadProgress: (data) => {
      console.log('Download progress:', data);
      const notification = document.getElementById('notification-' + data.downloadId);
      if (notification) {
        const progressBar = notification.querySelector('[style*="transition: width"]');
        const progressText = notification.querySelector('div[style*="font-size: 12px"]');
        if (progressBar) {
          progressBar.style.width = data.progress + '%';
        }
        if (progressText) {
          progressText.textContent = data.progress + '% complete';
        }
      }
    },

    onDownloadCompleted: (data) => {
      console.log('Download completed:', data);
      const existingNotification = document.getElementById('notification-' + data.downloadId);
      
      if (existingNotification) {
        // Update existing notification
        existingNotification.innerHTML = createNotification({
          ...data,
          status: 'completed'
        }).innerHTML;
      } else {
        // Create new notification
        const notification = createNotification({
          ...data,
          status: 'completed'
        });
        container.appendChild(notification);
      }

      // Auto remove after 5 seconds
      setTimeout(() => {
        removeNotification('notification-' + data.downloadId);
      }, 5000);
    },

    onDownloadError: (data) => {
      console.log('Download error:', data);
      const existingNotification = document.getElementById('notification-' + data.downloadId);
      
      if (existingNotification) {
        // Update existing notification
        existingNotification.innerHTML = createNotification({
          ...data,
          status: 'error'
        }).innerHTML;
      } else {
        // Create new notification
        const notification = createNotification({
          ...data,
          status: 'error'
        });
        container.appendChild(notification);
      }

      // Auto remove after 10 seconds
      setTimeout(() => {
        removeNotification('notification-' + data.downloadId);
      }, 10000);
    },

    onPdfDetected: (data) => {
      console.log('PDF detected:', data);
      const notification = createNotification({
        ...data,
        status: 'info'
      });
      container.appendChild(notification);

      // Auto remove after 3 seconds
      setTimeout(() => {
        removeNotification(notification.id);
      }, 3000);
    }
  };

  console.log('Download notification system initialized successfully!');
  
  // Make it globally accessible
  window.__electronNotificationReady = true;
})();
`;

module.exports = { notificationScript };
