/**
 * 脚本加载优化配置
 * 优化目标：减少阻塞渲染的脚本，提升 FCP 和 LCP
 */

// 1. 延迟加载非关键 JavaScript
function deferNonCriticalScripts() {
    // 延迟加载看板娘（如果存在）
    const pioScripts = ['pio/static/l2d.js', 'pio/static/pio.js'];
    pioScripts.forEach(src => {
        const script = document.querySelector(`script[src*="${src}"]`);
        if (script && !script.hasAttribute('defer')) {
            script.setAttribute('defer', '');
        }
    });
}

// 2. 优化第三方脚本加载 - 使用 requestIdleCallback
function loadThirdPartyScripts() {
    const scripts = [
        { src: '/js/anime.js', priority: 'low' },
        { src: '/js/yinghua.js', priority: 'low' },
    ];

    scripts.forEach(({ src, priority }) => {
        if (priority === 'low') {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => loadScript(src), { timeout: 3000 });
            } else {
                setTimeout(() => loadScript(src), 3000);
            }
        }
    });
}

function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)) return;
    
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
}

// 3. 预连接到关键第三方域名
function setupPreconnections() {
    const domains = [
        'https://www.googletagmanager.com',
        'https://www.clarity.ms',
        'https://www.bilibili.uno',
    ];

    domains.forEach(domain => {
        if (!document.querySelector(`link[href="${domain}"]`)) {
            const link = document.createElement('link');
            link.rel = 'preconnect';
            link.href = domain;
            link.crossOrigin = 'anonymous';
            document.head.appendChild(link);
        }
    });
}

// 4. 监听页面加载状态，分阶段加载资源
function phaseBasedLoading() {
    // Phase 1: 页面可交互后加载低优先级脚本
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        loadThirdPartyScripts();
    } else {
        document.addEventListener('DOMContentLoaded', loadThirdPartyScripts);
    }

    // Phase 2: 页面完全加载后处理装饰性功能
    window.addEventListener('load', () => {
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                // 装饰性动画和效果
                initDecorativeFeatures();
            }, { timeout: 5000 });
        } else {
            setTimeout(initDecorativeFeatures, 5000);
        }
    });
}

function initDecorativeFeatures() {
    // 初始化装饰性功能（如花瓣动画等）
    if (typeof window.initYinghua === 'function') {
        window.initYinghua();
    }
}

// 5. 使用 Intersection Observer 延迟加载屏幕外内容
function setupLazyLoadingObserver() {
    if (!('IntersectionObserver' in window)) return;

    const lazyElements = document.querySelectorAll('[data-lazy-load]');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target;
                const src = element.dataset.lazySrc;
                
                if (src) {
                    if (element.tagName === 'SCRIPT') {
                        loadScript(src);
                    } else if (element.tagName === 'IMG') {
                        element.src = src;
                    }
                }
                
                observer.unobserve(element);
            }
        });
    }, {
        rootMargin: '50px'
    });

    lazyElements.forEach(el => observer.observe(el));
}

// 6. 主函数 - 初始化所有优化
function initScriptOptimizations() {
    // 立即执行
    deferNonCriticalScripts();
    setupPreconnections();
    
    // 分阶段执行
    phaseBasedLoading();
    
    // 延迟执行
    if (document.readyState === 'complete') {
        setupLazyLoadingObserver();
    } else {
        window.addEventListener('load', setupLazyLoadingObserver);
    }
}

// 执行优化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScriptOptimizations);
} else {
    initScriptOptimizations();
}

// 导出供外部使用
window.scriptOptimizer = {
    loadScript,
    setupPreconnections,
    initDecorativeFeatures
};
