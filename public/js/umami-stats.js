(function(){
  function generateStatsText(pageViews, visits){
    return `浏览量 ${pageViews} · 访问次数 ${visits}`;
  }

  async function fetchSiteStats(base, apiKey, websiteId){
    try{
      if (window.getUmamiWebsiteStats) return await getUmamiWebsiteStats(base, apiKey, websiteId);
      // fallback: try basic fetch (requires CORS & API key)
      return null;
    }catch(e){ console.error('umami site stats error', e); return null; }
  }

  async function fetchPageStats(base, apiKey, websiteId, pageId){
    try{
      if (window.getUmamiPageStats) return await getUmamiPageStats(base, apiKey, websiteId, `/posts/${pageId}/`);
      return null;
    }catch(e){ console.error('umami page stats error', e); return null; }
  }

  function initScript(s){
    const type = s.dataset.umamiType;
    const base = s.dataset.umamiBase || '';
    const apiKey = s.dataset.umamiApikey || '';
    const websiteId = s.dataset.umamiWebsiteid || '';

    if (type === 'site') {
      const el = document.getElementById('site-stats-display');
      if (!el) return;
      fetchSiteStats(base, apiKey, websiteId).then(stats => {
        if (!stats) { el.textContent = '统计不可用'; return; }
        el.textContent = generateStatsText(stats.pageviews||0, stats.visits||0);
      }).catch(()=>{ el.textContent = '统计不可用'; });
    }

    if (type === 'page') {
      const pageId = s.dataset.pageId;
      const el = document.getElementById('page-views-display');
      if (!el || !pageId) return;
      fetchPageStats(base, apiKey, websiteId, pageId).then(stats => {
        if (!stats) { el.textContent = '统计不可用'; return; }
        el.textContent = generateStatsText(stats.pageviews||0, stats.visitors||0);
      }).catch(()=>{ el.textContent = '统计不可用'; });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){
      document.querySelectorAll('script[src$="/js/umami-stats.js"]').forEach(initScript);
    });
  } else {
    document.querySelectorAll('script[src$="/js/umami-stats.js"]').forEach(initScript);
  }
})();