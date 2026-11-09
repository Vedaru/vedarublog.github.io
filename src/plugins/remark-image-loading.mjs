import { visit } from "unist-util-visit";

/**
 * Raw HTML images bypass rehype, so mark those up in the remark tree before
 * Astro serializes them.
 */
export function remarkImageLoading() {
	return (tree) => {
		visit(tree, "html", (node) => {
			if (!/<img\b/i.test(node.value)) return;
			node.value = node.value.replace(/<img\b[^>]*>/gi, (tag) => {
				let output = tag;
				if (!/\bloading\s*=/i.test(output)) {
					output = output.replace(/^<img\b/i, '<img loading="lazy"');
				}
				if (!/\bdecoding\s*=/i.test(output)) {
					output = output.replace(
						/^<img\b/i,
						'<img decoding="async"',
					);
				}
				return output;
			});
		});
	};
}
