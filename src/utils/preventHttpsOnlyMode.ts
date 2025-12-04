/**
 * Utility to prevent HTTPS-Only mode from interfering with camera proxy
 * This helps ensure all HTTP camera requests go through our secure proxy
 */

export const preventHttpsOnlyModeInterference = () => {
  const originalFetch = window.fetch;
  
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : 
                input instanceof URL ? input.href : 
                input.url;
    
    // Check if this is a direct HTTP camera request while app is served over HTTPS
    if (url.startsWith('http://') && window.location.protocol === 'https:') {
      try {
        const u = new URL(url);
        const host = u.hostname;
        const isLocal = (
          host === 'localhost' ||
          host === '127.0.0.1' ||
          host.startsWith('192.168.') ||
          host.startsWith('10.') ||
          (host.startsWith('172.') && (() => { const s = parseInt(host.split('.')[1] || '0'); return s >= 16 && s <= 31; })())
        );
        
        if (!isLocal) {
          return Promise.reject(new Error('Direct HTTP camera requests blocked - use proxy instead'));
        }
      } catch (_) {
        return Promise.reject(new Error('Direct HTTP camera requests blocked - use proxy instead'));
      }
    }
    
    return originalFetch.call(this, input, init);
  };
};

export const restoreOriginalFetch = () => {
  // Placeholder for restoring original fetch if needed
};

export const addHttpsOnlyModeExceptions = () => {
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existing) {
    existing.remove();
  }
};

/**
 * Initialize all HTTPS-Only mode prevention measures
 */
export const initializeHttpsOnlyModePrevention = () => {
  try {
    preventHttpsOnlyModeInterference();
    addHttpsOnlyModeExceptions();
  } catch (error) {
    // Silent failure - don't log
  }
};