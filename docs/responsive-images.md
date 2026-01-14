# 响应式图片 (Adaptive Images)

说明：本项目新增了响应式图片支持，减少页面加载的图片大小并提升移动端性能。

主要改动：

- 新增脚本：`scripts/generate-responsive-images.js`，会对 `public/images` 下的图片生成多分辨率 WebP 变体（输出到 `public/_gen`），并生成 `public/_gen/manifest.json`。
- 新增组件：`src/components/ResponsiveImage.astro`，在服务端读取 manifest 并为 `<img>` 输出 `srcset`/`sizes` 与合理的 `loading`/`decoding` 属性。
- 为 Markdown 的 `<img>` 标签添加了 rehype 插件 `src/plugins/rehype-responsive-images.mjs`，会在构建时把 markdown 中的 `<img src="/images/xxx">` 转换为带 `srcset`/`sizes` 的输出（基于 manifest）。
- Twikoo 注释组件中新增了对评论图片的处理：在 DOM 中为评论图片设置 `loading="lazy"`、`decoding="async"` 并限制 `max-width` 以避免布局/性能问题。

使用方式：

1. 本地开发无需手动执行；`pnpm dev` 的前置脚本会尝试生成响应式图片（`predev` 已配置）。
2. 若需要手动执行：`pnpm generate:images`。
3. 在模板中优先使用 `ResponsiveImage` 组件替换 `<img>`。例如：

```astro
---
import ResponsiveImage from '~/components/ResponsiveImage.astro';
---
<ResponsiveImage src="/images/example.jpg" alt="示例" sizes="(max-width: 768px) 100vw, 50vw" />
```

注意：
- 生成脚本会基于 `public/images` 下现有图片生成多尺寸资源。建议在 CI 或构建流程中执行该脚本（已在 `prebuild` 中自动调用）。
- 对于外部图像或评论上传的图片（非仓库内的），本地脚本无法生成缩略图，请确保这些图片来自支持自动缩放/CDN 的源，或在后端处理。

效果：
- 通过使用 `srcset` 和合适的 `sizes`，浏览器会选择合适尺寸的图片，从而显著减少移动端的带宽消耗。