import { h } from "hastscript";
import { visit } from "unist-util-visit";
import mermaidRenderScript from "./mermaid-render-script.js?raw";

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

				// 创建 Mermaid 容器
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

				// 创建客户端渲染脚本
				const renderScript = h(
					"script",
					{
						type: "text/javascript",
					},
					mermaidRenderScript,
				);

				// 替换原始节点
				node.tagName = "div";
				node.properties = { class: "mermaid-diagram-container" };
				node.children = [mermaidContainer, renderScript];
			}
		});
	};
}
