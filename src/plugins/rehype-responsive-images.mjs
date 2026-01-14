import { visit } from 'unist-util-visit';
import fs from 'fs';
import path from 'path';

const manifestPath = path.resolve('public', '_gen', 'manifest.json');
let manifest = {};
if (fs.existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (e) {
    manifest = {};
  }
}

export function rehypeResponsiveImages(options = {}) {
  const defaultSizes = options.defaultSizes || '100vw';

  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'img') return;
      const props = node.properties || {};
      const src = props.src;
      if (!src || typeof src !== 'string') return;
      const entry = manifest[src];
      if (!entry) return;
      const variants = entry.variants || [];
      if (variants.length === 0) return;
      const srcset = variants.map((v) => `${v.src} ${v.width}w`).join(', ');
      props.srcset = srcset;
      if (!props.sizes) props.sizes = defaultSizes;
      props.src = entry.fallback || entry.original || src;
      node.properties = props;
    });
  };
}
