/**
 * 主题初始化脚本 - 延迟加载优化
 * 设置主题、颜色和移动设备优化
 */

// 全局注入变量
window.BANNER_HEIGHT = 35;
window.BANNER_HEIGHT_EXTEND = 30;
window.BANNER_HEIGHT_HOME = 65;

// 从 Astro 定义的变量获取配置
if (!window.DEFAULT_THEME) {
    window.DEFAULT_THEME = 'auto';
}
const LIGHT_MODE = window.LIGHT_MODE || 'light';
const DARK_MODE = window.DARK_MODE || 'dark';
const BANNER_HEIGHT_EXTEND = window.BANNER_HEIGHT_EXTEND || 30;
const PAGE_WIDTH = window.PAGE_WIDTH || 80;
const configHue = window.configHue || 250;

// Load the theme from local storage
const theme = localStorage.getItem('theme') || window.DEFAULT_THEME;
let isDark = false;
switch (theme) {
    case LIGHT_MODE:
        document.documentElement.classList.remove('dark');
        isDark = false;
        break;
    case DARK_MODE:
        document.documentElement.classList.add('dark');
        isDark = true;
        break;
}

// Set the theme for Expressive Code based on current mode
const expressiveTheme = isDark ? "github-dark" : "github-light";
const currentTheme = document.documentElement.getAttribute("data-theme");
if (currentTheme !== expressiveTheme) {
    document.documentElement.setAttribute("data-theme", expressiveTheme);
}

// Load the hue from local storage
const hue = localStorage.getItem('hue') || configHue;
document.documentElement.style.setProperty('--hue', hue);

// calculate the --banner-height-extend, which needs to be a multiple of 4 to avoid blurry text
let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
offset = offset - offset % 4;
document.documentElement.style.setProperty('--banner-height-extend', `${offset}px`);

// 移动设备优化：标记并移除导航中按钮的 scale-animation 类，防止伪元素阴影在触控设备上残留
try {
    const isTouchDevice = (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) || ('ontouchstart' in window);
    if (isTouchDevice) {
        // 标记 HTML，使 CSS 能更早作用
        document.documentElement.classList.add('is-touch');
        // 只移除导航栏内的按钮 scale-animation，保留桌面交互效果
        document.querySelectorAll('#navbar-wrapper .btn-plain.scale-animation').forEach(el => {
            el.classList.remove('scale-animation');
        });

        // 为触控设备添加按下态处理
        document.querySelectorAll('#navbar-wrapper .btn-plain').forEach(el => {
            try {
                // pointerdown 添加 pressed 状态
                el.addEventListener('pointerdown', () => {
                    el.classList.add('pressed');
                });
                // pointerup / pointercancel 移除 pressed，并 blur
                el.addEventListener('pointerup', () => {
                    setTimeout(() => {
                        try { el.blur(); } catch (e) {}
                        el.classList.remove('pressed');
                    }, 10);
                });
                el.addEventListener('pointercancel', () => {
                    try { el.blur(); } catch (e) {}
                    el.classList.remove('pressed');
                });
                // 兼容性：部分旧手机只触发 touchend
                el.addEventListener('touchend', () => {
                    setTimeout(() => {
                        try { el.blur(); } catch (e) {}
                        el.classList.remove('pressed');
                    }, 10);
                }, { passive: true });
            } catch (e) {
                // ignore per-element errors
            }
        });
    }
} catch (e) {
    // ignore
}