(function(){
  try {
    const scriptTag = document.currentScript || document.querySelector('script[data-script-url]');
    const scriptUrl = scriptTag && (scriptTag.dataset.scriptUrl || scriptTag.getAttribute('data-script-url'));
    if (!scriptUrl) return;

    async function loadPagefind() {
      try {
        const resp = await fetch(scriptUrl, { method: 'HEAD' });
        if (!resp.ok) throw new Error('Pagefind not found: ' + resp.status);

        const pagefind = await import(scriptUrl);
        if (pagefind && pagefind.options) {
          await pagefind.options({ excerptLength: 20 });
        }

        window.pagefind = pagefind;
        document.dispatchEvent(new CustomEvent('pagefindready'));
        console.log('Pagefind loaded and initialized.');
      } catch (err) {
        console.error('Failed to load Pagefind:', err);
        window.pagefind = {
          search: () => Promise.resolve({ results: [] }),
          options: () => Promise.resolve(),
        };
        document.dispatchEvent(new CustomEvent('pagefindloaderror'));
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', loadPagefind);
    } else {
      loadPagefind();
    }
  } catch (e) {
    console.error('pagefind-loader error', e);
  }
})();