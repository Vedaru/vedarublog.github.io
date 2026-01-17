(async function(){
	try{
		// Try to load playlist.json from known locations. Prefer /assets/music/playlist.json
		// (current downloader), but fall back to /music/playlist.json for Mizuki compatibility.
		const paths = ['/assets/music/playlist.json', '/music/playlist.json'];
		for (const p of paths) {
			try {
				const res = await fetch(p, { cache: 'no-store' });
				if (!res.ok) continue;
				const data = await res.json();
				window.musicData = data;
				console.debug('Loaded musicData from', p);
				break;
			} catch (e) {
				// ignore and try next
			}
		}
	} catch(e) {
		// silent fail
	}
})();