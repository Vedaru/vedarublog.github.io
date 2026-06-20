/**
 * 强制重排检测器 — 帮助定位 Chrome "Forced reflow" violation 的具体来源
 *
 * 原理：拦截所有会触发 layout read 的 DOM API，若某次调用耗时 >5ms，
 * 则打印调用栈，帮助定位引发昂贵强制重排的代码位置。
 *
 * 用法：在浏览器控制台中粘贴执行，或通过 <script> 标签引入。
 * 使用完毕后调用 window.__stopReflowDetector() 移除拦截。
 */
(function () {
  if (window.__reflowDetectorActive) return;
  window.__reflowDetectorActive = true;

  var THRESHOLD_MS = 8; // 超过此阈值才报告（过滤掉微小的正常重排）

  var layoutProps = [
    { obj: Element.prototype, props: ['getBoundingClientRect', 'scrollIntoView'] },
    { obj: HTMLElement.prototype, props: ['offsetTop', 'offsetLeft', 'offsetWidth', 'offsetHeight', 'offsetParent'] },
    { obj: window, props: ['getComputedStyle'] },
  ];

  // 不可枚举的 getter 属性（需通过 Object.getOwnPropertyDescriptor 访问）
  var layoutGetters = [
    { obj: Element.prototype, props: ['clientTop', 'clientLeft', 'clientWidth', 'clientHeight', 'scrollTop', 'scrollLeft', 'scrollWidth', 'scrollHeight'] },
    { obj: HTMLElement.prototype, props: ['offsetTop', 'offsetLeft', 'offsetWidth', 'offsetHeight'] },
  ];

  var originals = {};
  var getterOriginals = {};

  function formatStack(stack) {
    if (!stack) return '(no stack)';
    var lines = stack.split('\n');
    // 跳过前 3 行（Error, 拦截函数自身, 被拦截的方法）
    return lines.slice(3, 8).join('\n');
  }

  function measureCall(key, fn, ctx, args) {
    var start = performance.now();
    try {
      return fn.apply(ctx, args);
    } finally {
      var elapsed = performance.now() - start;
      if (elapsed > THRESHOLD_MS) {
        console.warn(
          '%c[ReflowDetector] %c' + key + ' %ctook %c' + elapsed.toFixed(1) + 'ms',
          'color: #f59e0b; font-weight: bold;',
          'color: #ef4444;',
          'color: inherit;',
          'color: #ef4444; font-weight: bold;',
          '\n' + formatStack(new Error().stack)
        );
      }
    }
  }

  // 拦截方法调用
  layoutProps.forEach(function (entry) {
    entry.props.forEach(function (prop) {
      var key = entry.obj.constructor.name + '.' + prop;
      if (!entry.obj[prop]) return;
      originals[key] = entry.obj[prop];
      entry.obj[prop] = function () {
        return measureCall(key, originals[key], this, arguments);
      };
    });
  });

  // 拦截 getter 属性访问
  layoutGetters.forEach(function (entry) {
    entry.props.forEach(function (prop) {
      var key = entry.obj.constructor.name + '.' + prop + '(getter)';
      var descriptor = Object.getOwnPropertyDescriptor(entry.obj, prop);
      if (!descriptor || !descriptor.get) return;
      getterOriginals[key] = descriptor.get;
      Object.defineProperty(entry.obj, prop, {
        get: function () {
          return measureCall(key, getterOriginals[key], this, []);
        },
        configurable: true,
      });
    });
  });

  console.log(
    '%c[ReflowDetector] %cActive — reporting layout reads > ' + THRESHOLD_MS + 'ms. ' +
    'Call %cwindow.__stopReflowDetector()%c to disable.',
    'color: #f59e0b; font-weight: bold;',
    'color: #10b981;',
    'color: #6366f1; font-weight: bold;',
    'color: inherit;'
  );

  window.__stopReflowDetector = function () {
    // 恢复方法
    Object.keys(originals).forEach(function (key) {
      var parts = key.split('.');
      var obj = parts[0] === 'Window' ? window :
                parts[0] === 'Element' ? Element.prototype :
                parts[0] === 'HTMLElement' ? HTMLElement.prototype : null;
      if (obj) obj[parts[1]] = originals[key];
    });
    // 恢复 getter
    Object.keys(getterOriginals).forEach(function (key) {
      var parts = key.split('.');
      var obj = parts[0] === 'Element' ? Element.prototype :
                parts[0] === 'HTMLElement' ? HTMLElement.prototype : null;
      if (obj) {
        Object.defineProperty(obj, parts[1], {
          get: getterOriginals[key],
          configurable: true,
        });
      }
    });
    window.__reflowDetectorActive = false;
    console.log('%c[ReflowDetector] %cStopped.', 'color: #f59e0b; font-weight: bold;', 'color: #10b981;');
  };
})();
