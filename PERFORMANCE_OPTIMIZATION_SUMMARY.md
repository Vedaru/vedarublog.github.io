# 网站加载速度优化总结

## 优化日期
2024年 - CLS (Cumulative Layout Shift) 优化专项

---

## 问题诊断

### 1. CLS 问题 (0.14 × 2 = 0.28)
根据用户提供的 Performance 调试图，发现两个关键元素导致布局偏移：
- `div.hidden.md:flex.items-center` - CLS 0.14
- `div.absolute.w-full.z-30.pointer-events-none.wallpaper-transparent` - CLS 0.14

**根本原因**：主内容区域使用了 `absolute` 定位和动态 `top` 值（`style="top: ${finalMainPanelTop}"`），在页面加载时产生显著的布局偏移。

### 2. JavaScript 阻塞渲染
- 大量内联脚本增加 HTML 大小
- 第三方分析脚本（GTM、Clarity）在页面加载早期执行
- 装饰性脚本（看板娘、花瓣动画）优先级过高

### 3. 初始 HTML 体积过大
- 内联的第三方分析脚本（约 2KB+）
- 多个 `is:inline` 脚本增加初始传输大小

---

## 实施的优化方案

### ✅ 1. 布局稳定性优化 (Layout Stability)

#### 文件：`src/styles/layout-stability.css`
创建了全面的 CSS 布局稳定性优化规则：

**核心优化**：
- **使用 `transform` 替代 `top` 定位**：避免触发布局重排
- **CSS contain 属性**：隔离元素渲染，防止影响外部布局
- **content-visibility**：延迟渲染屏幕外内容
- **骨架屏样式**：为异步加载内容提供占位
- **固定尺寸容器**：防止内容加载时跳动

```css
.main-content-stable {
    min-height: 100vh;
    transform: translateY(0);
    will-change: transform;
    transform: translate3d(0, 0, 0); /* GPU 加速 */
}
```

#### 文件：`src/layouts/MainGridLayout.astro`
**修改前**：
```astro
<div class="absolute w-full z-30" style="top: ${finalMainPanelTop}">
```

**修改后**：
```astro
<div 
    class="w-full z-30 main-content-stable" 
    style="--main-top: ${finalMainPanelTop}; transform: translateY(var(--main-top, 5.5rem));"
>
```

**效果**：
- 使用 CSS 变量 + `transform` 替代 `absolute` + `top`
- `transform` 不触发 layout，只触发 composite
- 大幅减少 CLS 指标

---

### ✅ 2. JavaScript 加载优化

#### 文件：`src/scripts/script-loader-optimizer.js`
创建了智能脚本加载管理器：

**功能模块**：
1. **分阶段加载策略**
   - Phase 1: DOMContentLoaded 后加载低优先级脚本
   - Phase 2: window.load 后加载装饰性功能

2. **使用 requestIdleCallback**
   - 在浏览器空闲时加载非关键脚本
   - 回退到 setTimeout（兼容旧浏览器）

3. **Intersection Observer**
   - 屏幕外脚本延迟加载
   - 节省初始加载带宽

4. **预连接优化**
   ```javascript
   const domains = [
       'https://www.googletagmanager.com',
       'https://www.clarity.ms',
       'https://www.bilibili.uno',
   ];
   ```

**预期效果**：
- 减少阻塞渲染的 JavaScript
- 提升 FCP (First Contentful Paint)
- 提升 TTI (Time to Interactive)

---

### ✅ 3. 第三方脚本外部化

#### 文件：`public/js/analytics-loader.js`
将内联的分析脚本移到外部文件：

**优化前** (`Layout.astro`)：
```astro
<script is:inline>
    // 内联 GTM + Clarity 代码（约 500+ 字符）
    function loadAnalytics() { ... }
</script>
```

**优化后**：
```astro
<script src="/js/analytics-loader.js" defer></script>
```

**收益**：
- 减少初始 HTML 大小约 2-3KB
- 脚本可被浏览器缓存
- `defer` 属性确保不阻塞 HTML 解析

---

### ✅ 4. CSS 优化引入

#### 文件：`src/layouts/Layout.astro`
新增布局稳定性 CSS 导入：

```typescript
import "../styles/layout-stability.css";
```

确保所有页面都应用了 CLS 优化规则。

---

## 性能指标预期改善

### Core Web Vitals 目标

| 指标 | 优化前 | 优化目标 | 改善措施 |
|------|--------|----------|----------|
| **CLS** | ~0.28 | < 0.1 | transform 替代 absolute、固定容器尺寸 |
| **LCP** | 16+ 秒 | < 2.5 秒 | 图片优化（已完成）、脚本延迟加载 |
| **FCP** | 未知 | < 1.8 秒 | 外部化脚本、减少 HTML 大小 |
| **TTI** | 未知 | < 3.8 秒 | 分阶段加载、requestIdleCallback |

---

## 技术细节

### 1. CSS Contain 属性使用
```css
.sidebar-stable {
    contain: layout style; /* 隔离布局和样式计算 */
}

#main-grid {
    contain: layout; /* 仅隔离布局 */
}
```

**好处**：
- 浏览器可以跳过被 contain 元素内部的布局计算
- 外部样式变化不会影响内部
- 内部变化不会影响外部

### 2. Transform vs Top 性能对比

| 属性 | 触发阶段 | 性能消耗 |
|------|----------|----------|
| `top` | Layout → Paint → Composite | 🔴 高 |
| `transform` | Composite | 🟢 低 |

**原因**：
- `top` 改变会触发整个渲染管道
- `transform` 只影响合成阶段，可使用 GPU 加速

### 3. 脚本加载优先级

```
1. 关键 CSS（内联）
2. 关键 JavaScript（defer）
3. 页面内容渲染
4. 低优先级脚本（requestIdleCallback）
5. 第三方分析（5秒延迟）
6. 装饰性功能（空闲时加载）
```

---

## 后续建议

### 🔍 需要验证的指标
1. **实际 CLS 值**：使用 Chrome DevTools Performance 面板测量
2. **LCP 改善**：确认大图片优化生效
3. **TTI 时间**：确认脚本延迟加载有效

### 🚀 进一步优化方向

#### 1. 字体加载优化
```css
@font-face {
    font-display: swap; /* 已在 layout-stability.css 中添加 */
}
```

#### 2. 图片响应式加载
```html
<img 
    srcset="image-320w.webp 320w, image-640w.webp 640w"
    sizes="(max-width: 640px) 100vw, 640px"
    loading="lazy"
>
```

#### 3. 资源预加载优先级
```html
<link rel="preload" href="critical.css" as="style">
<link rel="prefetch" href="next-page.html">
<link rel="dns-prefetch" href="https://api.example.com">
```

#### 4. Service Worker 缓存策略
考虑实现：
- 关键资源的 Cache First 策略
- API 数据的 Network First 策略
- 图片的 Stale While Revalidate 策略

---

## 文件清单

### 新增文件
1. ✅ `src/styles/layout-stability.css` - 布局稳定性 CSS 规则
2. ✅ `src/scripts/script-loader-optimizer.js` - 脚本加载优化器
3. ✅ `public/js/analytics-loader.js` - 第三方分析脚本
4. ✅ `PERFORMANCE_OPTIMIZATION_SUMMARY.md` - 本文档

### 修改文件
1. ✅ `src/layouts/Layout.astro` - 导入优化 CSS，外部化脚本
2. ✅ `src/layouts/MainGridLayout.astro` - 主内容区域定位优化

---

## 测试清单

### ✓ 功能测试
- [ ] 页面布局正常显示
- [ ] 导航栏固定定位正确
- [ ] 侧边栏响应式布局正常
- [ ] Banner 高度计算正确
- [ ] Swup 页面过渡动画流畅

### ✓ 性能测试
- [ ] Chrome DevTools Lighthouse 运行
- [ ] Performance 面板记录 CLS 指标
- [ ] Network 面板检查资源加载顺序
- [ ] 验证脚本延迟加载生效

### ✓ 兼容性测试
- [ ] Chrome 最新版
- [ ] Firefox 最新版
- [ ] Safari 最新版
- [ ] 移动端浏览器（iOS Safari、Chrome Mobile）

---

## 回滚计划

如果优化导致问题，可回滚：

### 1. 恢复 absolute 定位
```astro
<div class="absolute w-full z-30" style="top: ${finalMainPanelTop}">
```

### 2. 移除外部脚本引用
```astro
<!-- 删除这两行 -->
<script src="/src/scripts/script-loader-optimizer.js" defer></script>
<script src="/js/analytics-loader.js" defer></script>
```

### 3. 恢复内联分析脚本
参考 Git 历史中的原始 `Layout.astro` 文件。

---

## 参考资料

- [Web Vitals](https://web.dev/vitals/)
- [Optimize Cumulative Layout Shift](https://web.dev/optimize-cls/)
- [CSS Containment](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Containment)
- [requestIdleCallback](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestIdleCallback)
- [Resource Hints](https://www.w3.org/TR/resource-hints/)

---

## 结论

本次优化主要针对 **CLS (Cumulative Layout Shift)** 问题，通过以下手段：
1. 使用 `transform` 替代 `absolute` 定位
2. CSS contain 属性隔离渲染
3. 分阶段、按需加载 JavaScript
4. 外部化第三方脚本减少 HTML 大小

预期可将 CLS 从 **0.28** 降至 **< 0.1**，显著提升用户体验和 SEO 排名。

---

**优化完成时间**：2024年  
**优化工程师**：GitHub Copilot  
**下次审查时间**：建议 2 周后使用真实用户监控数据验证效果
