/// <reference types="mdast" />
import { h } from "hastscript";
import { visit } from "unist-util-visit";

const FORGEJO_ORIGIN = "https://git.vedaru.cn";
const repoCache = new Map();
const compactNumber = new Intl.NumberFormat("en-us", {
	notation: "compact",
	maximumFractionDigits: 1,
});

function cleanDescription(value, fallback) {
	return (value || fallback).replace(/:[a-zA-Z0-9_]+:/g, "");
}

function invalidCard(message) {
	return h("div", { class: "hidden" }, message);
}

async function fetchRepo(repo) {
	if (!repoCache.has(repo)) {
		const request = (async () => {
			try {
				const response = await fetch(
					`${FORGEJO_ORIGIN}/api/v1/repos/${repo}`,
					{
						headers: { Accept: "application/json" },
						signal: AbortSignal.timeout(8000),
					},
				);
				if (!response.ok) return null;
				return await response.json();
			} catch {
				return null;
			}
		})();
		repoCache.set(repo, request);
	}
	return repoCache.get(repo);
}

function buildForgejoCard(repo, data, overrides = {}) {
	const [owner, name] = repo.split("/");
	const avatar = data?.owner?.avatar_url;
	const description = cleanDescription(
		data?.description,
		"Repository on git.vedaru.cn",
	);
	const license =
		overrides.license ||
		data?.license?.spdx_id ||
		data?.licenses?.[0]?.spdx_id ||
		"no-license";
	const cardUuid = `FJ${Math.random().toString(36).slice(-6)}`;

	return h(
		`a#${cardUuid}-card`,
		{
			class: "card-github card-forgejo no-styling",
			href: data?.html_url || `${FORGEJO_ORIGIN}/${repo}`,
			target: "_blank",
			rel: "noopener noreferrer",
			"aria-label": `Forgejo repository ${repo}`,
		},
		[
			h("div", { class: "gc-titlebar" }, [
				h("div", { class: "gc-titlebar-left" }, [
					h("div", { class: "gc-owner" }, [
						h("div", {
							class: "gc-avatar",
							style: avatar
								? `background-image: url("${avatar}"); background-color: transparent;`
								: undefined,
						}),
						h("div", { class: "gc-user" }, owner),
					]),
					h("div", { class: "gc-divider" }, "/"),
					h("div", { class: "gc-repo" }, name),
				]),
				h("div", { class: "forgejo-logo" }),
			]),
			h("div", { class: "gc-description" }, description),
			h("div", { class: "gc-infobar" }, [
				h(
					"div",
					{ class: "gc-stars" },
					compactNumber.format(data?.stars_count ?? 0),
				),
				h(
					"div",
					{ class: "gc-forks" },
					compactNumber.format(data?.forks_count ?? 0),
				),
				h("div", { class: "gc-license" }, license),
				h("div", { class: "gc-language" }, data?.language || "Unknown"),
			]),
		],
	);
}

export function rehypeForgejoCard() {
	return async (tree) => {
		const targets = [];

		visit(tree, "element", (node, index, parent) => {
			if (node.tagName !== "forgejo" || index == null || !parent) return;
			targets.push({ node, index, parent });
		});

		await Promise.all(
			targets.map(async ({ node, index, parent }) => {
				if (
					Array.isArray(node.children) &&
					node.children.length !== 0
				) {
					parent.children[index] = invalidCard(
						'Invalid directive. ("forgejo" directive must be leaf type "::forgejo{repo="owner/repo"}")',
					);
					return;
				}

				const repo = String(node.properties?.repo || "");
				if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
					parent.children[index] = invalidCard(
						'Invalid repository. ("repo" attribute must be in the format "owner/repo")',
					);
					return;
				}

				const data = await fetchRepo(repo);
				parent.children[index] = buildForgejoCard(repo, data, {
					license: String(node.properties?.license || ""),
				});
			}),
		);
	};
}
