(function(){
	// 从页面读取日记数据
	function loadDiaryDataFromPage() {
		const dataElement = document.getElementById('diary-page-data');
		if (!dataElement) {
			const allDataElements = document.querySelectorAll('[data-page-type="diary"]');
			if (allDataElements.length > 0) return JSON.parse(allDataElements[0].getAttribute('data-grouped-moments') || '[]');
			return null;
		}
		const dataAttr = dataElement.getAttribute('data-grouped-moments');
		if (!dataAttr) return null;
		try { return JSON.parse(dataAttr); } catch(e){ return null; }
	}

	async function waitForCustomElement(tagName, timeout = 5000) {
		const startTime = Date.now();
		while (Date.now() - startTime < timeout) {
			if (customElements.get(tagName)) return true;
			await new Promise(resolve => setTimeout(resolve, 50));
		}
		return false;
	}

	if (typeof window.isInjecting === 'undefined') window.isInjecting = false;

	async function injectDiaryTOC() {
		if (window.isInjecting) return;
		window.isInjecting = true;
		const diaryTocWrapper = document.getElementById('diary-toc-wrapper');
		const diaryTocContainer = document.getElementById('diary-toc');
		if (!diaryTocContainer || !diaryTocWrapper) { window.isInjecting = false; return; }
		await waitForCustomElement('diary-table-of-contents');
		const groupedMoments = loadDiaryDataFromPage();
		if (!groupedMoments || groupedMoments.length === 0) { window.isInjecting = false; return; }
		window.diaryGroupedMoments = groupedMoments;
		const groupedMomentsJSON = JSON.stringify(groupedMoments);
		let diaryToc = diaryTocContainer.querySelector('diary-table-of-contents');
		if (!diaryToc) {
			diaryToc = document.createElement('diary-table-of-contents');
			diaryToc.className = 'group';
			diaryTocContainer.appendChild(diaryToc);
		}
		diaryToc.setAttribute('data-grouped-moments', groupedMomentsJSON);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				diaryTocWrapper.classList.remove('hidden');
				diaryTocWrapper.classList.add('lg:block');
				requestAnimationFrame(() => {
					diaryTocWrapper.classList.remove('opacity-0');
					diaryTocWrapper.classList.add('opacity-100');
					window.isInjecting = false;
				});
			});
		});
	}

	function hideDiaryTOC() {
		window.diaryGroupedMoments = null;
		const diaryTocWrapper = document.getElementById('diary-toc-wrapper');
		if (diaryTocWrapper) {
			diaryTocWrapper.classList.remove('opacity-100');
			diaryTocWrapper.classList.add('opacity-0');
			setTimeout(() => {
				diaryTocWrapper.classList.add('hidden');
				diaryTocWrapper.classList.remove('lg:block');
			}, 300);
		}
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			if (window.location.pathname.includes('/diary')) injectDiaryTOC();
		});
	} else {
		if (window.location.pathname.includes('/diary')) injectDiaryTOC();
	}

	document.addEventListener('swup:page:view', () => {
		if (window.location.pathname.includes('/diary')) injectDiaryTOC(); else hideDiaryTOC();
	});
})();