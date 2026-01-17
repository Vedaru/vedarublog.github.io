(async function(){
	try{
		// try to load playlist.json if present, set window.musicData
		const res = await fetch('/music/playlist.json', { cache: 'no-store' });
		if (!res.ok) return;
		const data = await res.json();
		window.musicData = data;
	} catch(e) {
		// silent fail
	}
})();