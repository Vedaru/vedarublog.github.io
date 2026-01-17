(function(){
	const el = document.getElementById('global-loading');
	if(!el) return;
	function show(){
		try { window.__loadingScreenDone = false; } catch {}
		try { document.documentElement.classList.add('loading-active'); } catch {}
		el.style.display = 'flex';
		el.classList.remove('opacity-0');
		el.setAttribute('aria-hidden','false');
		try { window.dispatchEvent(new CustomEvent('mizuki:loading:start')); } catch {}
	}
	function hide(){
		el.classList.add('opacity-0');
		el.setAttribute('aria-hidden','true');
		setTimeout(()=>{ el.style.display = 'none'; }, 300);
		try { document.documentElement.classList.remove('loading-active'); } catch {}
		try { window.__loadingScreenDone = true; } catch {}
		try { window.dispatchEvent(new CustomEvent('mizuki:loading:end')); } catch {}
	}
	if (document.readyState === 'complete') {
		hide();
	} else {
		show();
		window.addEventListener('load', hide, { once: true });
	}
})();