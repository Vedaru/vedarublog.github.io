/**
 * 第三方分析脚本 - 延迟加载优化
 * 在页面完全加载后再加载第三方分析工具
 */

// 预定义全局变量避免运行时 undefined 错误
window.BANNER_HEIGHT = 35;
window.BANNER_HEIGHT_EXTEND = 30;
window.BANNER_HEIGHT_HOME = 65;

// 使用 requestIdleCallback 延迟加载第三方脚本
function loadAnalytics() {
    // Google Tag Manager
    (function(w,d,s,l,i){
        w[l]=w[l]||[];
        w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),
            dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;
        j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
        f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-KRX3XGVH');
    
    // Clarity
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);
        t.async=1;
        t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];
        y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "tjr3vkhj8i");
}

// 延迟5秒加载分析脚本，确保首屏完全加载
if ('requestIdleCallback' in window) {
    requestIdleCallback(loadAnalytics, { timeout: 5000 });
} else {
    setTimeout(loadAnalytics, 5000);
}
