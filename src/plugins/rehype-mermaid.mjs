import { h } from "hastscript";
import { visit } from "unist-util-visit";

export function rehypeMermaid() {
	return (tree) => {
		visit(tree, "element", (node) => {
			if (
				node.tagName === "div" &&
				node.properties &&
				node.properties.className &&
				node.properties.className.includes("mermaid-container")
			) {
				const mermaidCode = node.properties["data-mermaid-code"] || "";
				const mermaidId = `mermaid-${Math.random().toString(36).slice(-6)}`;

				const mermaidContainer = h(
					"div",
					{
						class: "mermaid-wrapper",
						id: mermaidId,
					},
					[
						h(
							"div",
							{
								class: "mermaid",
								"data-mermaid-code": mermaidCode,
							},
							// 勿将 mermaid 源码作为文本子节点：其中的 <br/> 等会被当成 HTML，导致图表失败并露出源码
							[
								h(
									"div",
									{ class: "mermaid-loading" },
									"Rendering diagram...",
								),
							],
						),
					],
				);

				node.tagName = "div";
				node.properties = { class: "mermaid-diagram-container" };
				node.children = [mermaidContainer];
			}
		});
	};
}
