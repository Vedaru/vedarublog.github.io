(function(){
	try{
		if (typeof document !== 'undefined' && document.querySelector('.katex')) {
			const l = document.createElement('link');
			l.rel = 'stylesheet';
			l.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.25/dist/katex.min.css';
			l.crossOrigin = 'anonymous';
			document.head.appendChild(l);
		}
	} catch(e){}
})();