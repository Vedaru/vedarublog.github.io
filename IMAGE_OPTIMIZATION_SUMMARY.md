# 图片加载优化总结

## 优化目标
优化页面中图片元素的加载性能，特别是针对 LCP (Largest Contentful Paint) 性能指标。

## 已实施的优化措施

### 1. **关键图片预加载** (Layout.astro)
- 在 `<head>` 中添加了关键图片的 `preload` 链接
- 首页预加载头像图片：`/assets/home/Image_1764853150683.webp`
- 动漫页面预加载封面图片：`/assets/anime/86139c9ac6572ee5c3ab9ac61f77a51f4405240c.webp`
- 使用 `fetchpriority="high"` 提高加载优先级

```html
{isHomePage && (
  <link rel="preload" as="image" href={url("/assets/home/Image_1764853150683.webp")} fetchpriority="high" />
)}
{Astro.url.pathname.includes('/anime') && (
  <link rel="preload" as="image" href="/assets/anime/86139c9ac6572ee5c3ab9ac61f77a51f4405240c.webp" fetchpriority="high" />
)}
```

### 2. **优化 AnimeCard 组件加载策略**
- **第 1 张图片**：使用 `loading="eager"` + `fetchpriority="high"` 立即加载
- **第 2-3 张图片**：使用 `loading="lazy"` + `fetchpriority="high"` 优先懒加载
- **其余图片**：使用 `loading="lazy"` + `fetchpriority="low"` + `data-src` 延迟加载

优化前：前 6 张都是 eager 加载
优化后：仅前 3 张优先加载，减少初始加载压力

### 3. **改进图片预加载器** (animeImagePreloader.ts)
- 提高预加载距离：从 200px 增加到 400px
- 降低触发阈值：从 0.1 降到 0.01，更早触发预加载
- 使用 Image() 对象预加载，避免阻塞主线程
- 预加载完成后才设置到实际的 img 元素

```typescript
// 优化前：直接设置 src，可能阻塞渲染
img.src = src;

// 优化后：使用 Image() 对象预加载
const preloadImg = new Image();
preloadImg.onload = () => {
  img.src = src;  // 加载完成后才设置
};
preloadImg.src = src;
```

### 4. **CSS 视觉优化** (anime.css)
- 添加 `content-visibility: auto` 和 `contain` 属性，优化渲染性能
- 为未加载图片添加闪烁加载动画效果 (shimmer)
- 图片加载完成后添加淡入动画

```css
.anime-page .anime-card img[data-src] {
  background: linear-gradient(90deg, ...);
  animation: shimmer 1.5s infinite;
}

.anime-page .anime-card[data-preload="true"] img {
  animation: fadeIn 0.3s ease-in;
}
```

### 5. **优化关键 UI 元素**
- **导航栏 Logo**：改为 `loading="eager"` + `fetchpriority="high"` + `decoding="async"`
- **Profile 头像**：设置 `priority={true}` 确保优先加载

## 性能提升预期

### LCP 改善
- **首页**：头像图片预加载，减少 LCP 时间
- **动漫页面**：封面图片预加载 + 优化加载策略，显著降低 LCP

### 其他改善
- 减少初始加载的图片数量（从 6 张降到 1 张 eager）
- 更智能的懒加载策略，提前 400px 预加载
- 更好的加载体验（shimmer 动画）

## 建议的后续优化

### 1. 响应式图片
使用 `<picture>` 标签或 `srcset` 提供不同尺寸的图片：
```html
<img srcset="image-320w.webp 320w, image-640w.webp 640w" 
     sizes="(max-width: 640px) 320px, 640px">
```

### 2. 图片压缩
- 确保 WebP 图片质量设置合理（建议 80-90）
- 考虑使用 AVIF 格式（更好的压缩率）
- 为大图片生成多种尺寸

### 3. CDN 加速
- 将图片资源部署到 CDN
- 启用 HTTP/2 或 HTTP/3
- 配置合理的缓存策略

### 4. 监控和测试
- 使用 Lighthouse 测试 LCP 改善情况
- 使用 WebPageTest 分析加载瀑布图
- 使用 Chrome DevTools 的 Performance 面板分析

## 已转换的图片
- ✅ `86139c9ac6572ee5c3ab9ac61f77a51f4405240c.png` → `.webp`
- ✅ 更新了 `anime.ts` 中的引用

## 注意事项
- 所有优化都是渐进式的，不会影响旧浏览器
- `fetchpriority` 在旧浏览器中会被忽略
- `content-visibility` 是现代浏览器特性，有良好降级
