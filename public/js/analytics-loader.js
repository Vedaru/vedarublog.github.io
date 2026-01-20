(function () {
  'use strict';

  // Safe script loader with timeout and onerror handling
  function loadScript(src, { timeout = 5000 } = {}) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();

      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.defer = true;
      s.crossOrigin = 'anonymous';

      let timer = setTimeout(() => {
        s.onload = s.onerror = null;
        // Remove to avoid leaving a half-loaded tag
        try { s.parentNode && s.parentNode.removeChild(s); } catch (e) {}
        reject(new Error('timeout'));
      }, timeout);

      s.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      s.onerror = () => {
        clearTimeout(timer);
        try { s.parentNode && s.parentNode.removeChild(s); } catch (e) {}
        reject(new Error('error loading ' + src));
      };

      document.head.appendChild(s);
    });
  }

  // Probe a URL using fetch; if request fails (network error), we treat it as unreachable.
  // Use no-cors mode to avoid CORS issues; a network failure will reject the promise.
  function probeUrl(url, { timeout = 3000 } = {}) {
    return new Promise((resolve, reject) => {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const signal = controller ? controller.signal : undefined;

      let timer = setTimeout(() => {
        try { controller && controller.abort(); } catch (e) {}
        reject(new Error('probe timeout'));
      }, timeout);

      fetch(url, { method: 'HEAD', mode: 'no-cors', signal })
        .then(() => {
          clearTimeout(timer);
          resolve(true);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  function loadClarityIfAvailable(clarityId) {
    if (!clarityId) return Promise.resolve();
    const url = `https://www.clarity.ms/tag/${encodeURIComponent(clarityId)}`;

    // Probe first; if probe fails, skip loading to avoid noisy network errors
    return probeUrl(url, { timeout: 2500 })
      .then(() => loadScript(url, { timeout: 8000 }))
      .catch(() => {
        // Important: don't throw — just log quietly so console isn't spammed with stack traces
        // Browser will still show a network error if the request itself is blocked; but by probing first
        // we often avoid appending a script that will fail immediately.
        // Use console.debug for low noise level.
        console.debug('Clarity not reachable, skipping loading clarity script.');
      });
  }

  function loadAnalytics() {
    try {
      // Clarity ID lookup: prefer window.CLARITY_ID, then meta tag
      const clarityId = window.CLARITY_ID || (document.querySelector('meta[name="clarity-id"]') && document.querySelector('meta[name="clarity-id"]').content) || null;

      // Load Clarity only if an ID is provided and reachable
      loadClarityIfAvailable(clarityId).catch(() => {});

      // TODO: add other analytics (GTM/Umami) here with similar guards
    } catch (e) {
      console.warn('Analytics loader encountered an error', e);
    }
  }

  // Schedule load during idle time, with timeout fallback
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadAnalytics, { timeout: 2000 });
  } else {
    setTimeout(loadAnalytics, 1500);
  }

  // Export helper for debugging or manual invocation
  window.loadAnalytics = loadAnalytics;
})();
