/* AnimeImagePreloader - compiled plain JavaScript module for browser runtime */

class AnimeImagePreloader {
  constructor() {
    this.preloadDistance = 400; // pixels
    this.preloadedImages = new Set();
    this.observer = new IntersectionObserver(this.handleIntersection.bind(this), {
      rootMargin: `${this.preloadDistance}px 0px`,
      threshold: 0.01
    });
  }

  observe(card) {
    this.observer.observe(card);
  }

  unobserve(card) {
    this.observer.unobserve(card);
  }

  handleIntersection(entries) {
    entries.forEach(entry => {
      const card = entry.target;
      if (entry.isIntersecting) {
        this.preloadImage(card);
      }
    });
  }

  preloadImage(card) {
    const img = card.querySelector('img[data-src]');
    if (!img) return;

    const src = img.dataset.src;
    if (!src) return;
    if (this.preloadedImages.has(src)) return;

    this.preloadedImages.add(src);

    const preloadImg = new Image();
    preloadImg.decoding = 'async';
    preloadImg.onload = () => {
      img.src = src;
      card.setAttribute('data-preload', 'true');
    };
    preloadImg.onerror = () => {
      img.src = src;
    };
    preloadImg.src = src;
  }

  destroy() {
    this.observer.disconnect();
    this.preloadedImages.clear();
  }
}

let globalPreloader = null;
export function initAnimeImagePreloader() {
  if (globalPreloader) return globalPreloader;
  globalPreloader = new AnimeImagePreloader();
  return globalPreloader;
}

export function getAnimeImagePreloader() {
  return globalPreloader;
}

export function destroyAnimeImagePreloader() {
  if (globalPreloader) {
    globalPreloader.destroy();
    globalPreloader = null;
  }
}
