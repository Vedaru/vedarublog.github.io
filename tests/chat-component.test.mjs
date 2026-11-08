import assert from "node:assert/strict";
import { test } from "node:test";

import { h } from "hastscript";

import {
	ChatComponent,
	parseTimestamp,
} from "../src/plugins/rehype-component-chat.mjs";

const paragraph = (value) => h("p", value);
const className = (node) => (node.properties?.className ?? []).join(" ");
const items = (tree) =>
	tree.children.filter(
		(node) => node.type === "element" && node.tagName === "li",
	);
const messages = (tree) =>
	items(tree).filter((node) => className(node).includes("m3-chat__msg"));
const text = (node) => {
	if (node.type === "text") return node.value;
	return (node.children ?? []).map(text).join("");
};

test("parses valid timestamps and rejects impossible ones", () => {
	assert.deepEqual(parseTimestamp("10:02"), {
		datetime: "10:02",
		seconds: 36120,
		dateKey: null,
	});
	assert.deepEqual(parseTimestamp("2026-02-23 10:02"), {
		datetime: "2026-02-23T10:02",
		seconds: 36120,
		dateKey: "2026-02-23",
	});
	assert.equal(parseTimestamp("2026-02-30").datetime, null);
	assert.equal(parseTimestamp("24:00").datetime, null);
	assert.equal(parseTimestamp("09:60").datetime, null);
	assert.equal(parseTimestamp("昨天").datetime, null);
});

test("groups same-sender messages up to 121 seconds, not 122", () => {
	const grouped = messages(
		ChatComponent(
			{},
			[paragraph("[A|10:00] one"), paragraph("[A|10:02:01] two")],
			{},
		),
	);
	assert.ok(className(grouped[0]).includes("is-group-first"));
	assert.ok(!className(grouped[0]).includes("is-group-last"));
	assert.ok(className(grouped[1]).includes("is-group-last"));
	assert.ok(!className(grouped[1]).includes("is-group-first"));

	const separate = messages(
		ChatComponent(
			{},
			[paragraph("[A|10:00] one"), paragraph("[A|10:02:02] two")],
			{},
		),
	);
	for (const message of separate) {
		assert.ok(className(message).includes("is-group-first"));
		assert.ok(className(message).includes("is-group-last"));
	}
});

test("sender, side, day, notes and dividers break groups", () => {
	const pairs = [
		["[A|10:00] x", "[B|10:00] y"],
		["[A|10:00] x", "[A|10:00|right] y"],
		["[A|2026-02-23 10:00] x", "[A|2026-02-24 10:00] y"],
	];
	for (const [first, second] of pairs) {
		for (const message of messages(
			ChatComponent({}, [paragraph(first), paragraph(second)], {}),
		)) {
			assert.ok(className(message).includes("is-group-first"));
			assert.ok(className(message).includes("is-group-last"));
		}
	}

	for (const middle of ["((note))", "[[2026-02-23]]"]) {
		for (const message of messages(
			ChatComponent(
				{},
				[
					paragraph("[A|10:00] x"),
					paragraph(middle),
					paragraph("[A|10:00] y"),
				],
				{},
			),
		)) {
			assert.ok(className(message).includes("is-group-first"));
			assert.ok(className(message).includes("is-group-last"));
		}
	}
});

test("reply points at the nearest earlier message and quotes its text", () => {
	const tree = ChatComponent(
		{},
		[
			paragraph("[A|10:00] one"),
			paragraph("[A|10:01] two"),
			paragraph("[B|10:02|right|A] hi"),
		],
		{},
	);
	const reply = messages(tree)[2].children[0].children.find((node) =>
		className(node).includes("m3-chat__reply"),
	);
	assert.ok(reply.properties.href.endsWith("-1"));
	assert.equal(text(reply.children[0]), "A");
	assert.equal(text(reply.children[1]), "two");
});

test("reply can target a later message and truncates the preview", () => {
	const tree = ChatComponent(
		{},
		[
			paragraph("[B|10:00|right|A] hi"),
			paragraph(`[A|10:01] ${"x".repeat(200)}`),
		],
		{},
	);
	const reply = messages(tree)[0].children[0].children.find((node) =>
		className(node).includes("m3-chat__reply"),
	);
	assert.ok(reply.properties.href.endsWith("-1"));
	const quote = text(reply.children[1]);
	assert.equal(quote.length, 140);
	assert.ok(quote.endsWith("…"));
});

test("a missing reply target is a span, not a link", () => {
	const reply = messages(
		ChatComponent({}, [paragraph("[B|10:00|right|Nobody] hi")], {}),
	)[0].children[0].children.find((node) =>
		className(node).includes("m3-chat__reply"),
	);
	assert.equal(reply.tagName, "span");
	assert.equal(reply.properties.href, undefined);
});

test("headers can continue inline and pipe links are not headers", () => {
	const inline = ChatComponent(
		{},
		[h("p", ["[A|10:00] hello ", h("strong", "there")])],
		{},
	);
	const findTag = (node, tag) => {
		if (node.type === "element" && node.tagName === tag) return node;
		for (const child of node.children ?? []) {
			const found = findTag(child, tag);
			if (found) return found;
		}
		return null;
	};
	assert.ok(findTag(items(inline)[0], "strong"));

	const note = ChatComponent(
		{},
		[h("p", "[foo|bar](https://example.com) text")],
		{},
	);
	assert.equal(className(items(note)[0]), "m3-chat__note");
});

test("invalid timestamps stay text and unknown positions warn", () => {
	const warnings = [];
	const html = JSON.stringify(
		ChatComponent({}, [paragraph("[A|2026-02-30|middle] hi")], {
			vfile: { message: (message) => warnings.push(message) },
		}),
	);
	assert.ok(!html.includes("datetime"));
	assert.ok(
		warnings.some((message) =>
			message.includes('unknown position "middle"'),
		),
	);
});

test("empty chats render nothing and warn", () => {
	const warnings = [];
	assert.equal(
		ChatComponent({}, [], {
			vfile: { message: (message) => warnings.push(message) },
		}),
		null,
	);
	assert.ok(warnings[0].includes("empty :::chat"));
});

test("system notes keep inline markup, including a trailing element", () => {
	const bold = ChatComponent(
		{},
		[h("p", ["((Alice ", h("strong", "joined"), "))"])],
		{},
	);
	assert.equal(className(items(bold)[0]), "m3-chat__note");
	assert.match(text(items(bold)[0]), /Alice joined/);

	const link = ChatComponent(
		{},
		[h("p", ["((Alice ", h("a", { href: "#x" }, "joined"), " now))"])],
		{},
	);
	assert.equal(className(items(link)[0]), "m3-chat__note");
	assert.match(text(items(link)[0]), /Alice joined now/);
});

test("names=both labels the own side once per group", () => {
	const chat = [
		paragraph("[A|10:00] left"),
		paragraph("[B|10:00|right] right"),
		paragraph("[B|10:01|right] right again"),
	];
	const auto = messages(ChatComponent({}, chat, {}));
	assert.equal(text(auto[0].children[0].children[0]), "A");
	assert.ok(
		className(auto[1].children[0].children[0]).includes("m3-chat__sr"),
	);

	const both = messages(ChatComponent({ names: "both" }, chat, {}));
	assert.equal(text(both[1].children[0].children[0]), "B");
	assert.ok(
		className(both[2].children[0].children[0]).includes("m3-chat__sr"),
	);

	const none = messages(ChatComponent({ names: "none" }, chat, {}));
	assert.ok(
		className(none[0].children[0].children[0]).includes("m3-chat__sr"),
	);
});

test("names and reply quotes use stable peer colours", () => {
	const tree = ChatComponent(
		{},
		[
			paragraph("[Alice|10:00] one"),
			paragraph("[Bob|10:01] two"),
			paragraph("[Alice|10:02|right|Bob] three"),
		],
		{},
	);
	const [alice, bob, replyMessage] = messages(tree);
	const peer = (node) => className(node).match(/m3-chat__peer--\d/)?.[0];

	assert.ok(peer(alice));
	assert.notEqual(peer(alice), peer(bob));
	assert.equal(peer(replyMessage), peer(alice));

	const reply = replyMessage.children[0].children.find((node) =>
		className(node).includes("m3-chat__reply"),
	);
	assert.ok(className(reply).includes(peer(bob)));
	assert.equal(className(reply).match(/m3-chat__peer--\d/)?.[0], peer(bob));
});

test("peer colours survive unresolved replies, notes and separate chats", () => {
	const peer = (node) => className(node).match(/m3-chat__peer--\d/)?.[0];

	// The reply names Zed before Zed has spoken. The quote still uses Zed's
	// colour, and the later Zed message gets the same class.
	const tree = ChatComponent(
		{},
		[
			paragraph("[A|10:00] one"),
			paragraph("[B|10:01|right|Zed] quoting forward"),
			paragraph("[Zed|10:02] hello"),
		],
		{},
	);
	const [alice, bob, zed] = messages(tree);
	const reply = bob.children[0].children.find((node) =>
		className(node).includes("m3-chat__reply"),
	);
	assert.equal(peer(reply), peer(zed));

	// Notes and dividers carry no peer class.
	const noteTree = ChatComponent(
		{},
		[
			paragraph("((note))"),
			paragraph("[[2026-01-01]]"),
			paragraph("[A|10:00] hi"),
		],
		{},
	);
	assert.ok(!className(items(noteTree)[0]).includes("m3-chat__peer--"));
	assert.ok(!className(items(noteTree)[1]).includes("m3-chat__peer--"));

	// The same name gets the same colour in a separate chat block.
	const another = ChatComponent({}, [paragraph("[Zed|11:00] again")], {});
	assert.equal(peer(messages(another)[0]), peer(zed));

	// names=none hides the name but keeps the peer class for styling hooks.
	const hidden = messages(
		ChatComponent({ names: "none" }, [paragraph("[Zed|10:00] hi")], {}),
	)[0];
	assert.ok(peer(hidden));
	assert.ok(
		className(hidden.children[0].children[0]).includes("m3-chat__sr"),
	);
});

test("NFC and NFD spellings share a peer colour and group", () => {
	const nfc = "é";
	const nfd = "e\u0301";
	const peer = (node) => className(node).match(/m3-chat__peer--\d/)?.[0];

	const tree = ChatComponent(
		{},
		[paragraph(`[${nfc}|10:00] one`), paragraph(`[${nfd}|10:01] two`)],
		{},
	);
	const [first, second] = messages(tree);
	assert.equal(peer(first), peer(second));
	assert.ok(className(first).includes("is-group-first"));
	assert.ok(className(second).includes("is-group-last"));

	const replyTree = ChatComponent(
		{},
		[
			paragraph(`[${nfc}|10:00] one`),
			paragraph(`[Bob|10:01|right|${nfd}] hi`),
		],
		{},
	);
	const reply = messages(replyTree)[1].children[0].children.find((node) =>
		className(node).includes("m3-chat__reply"),
	);
	assert.ok(reply.properties.href);
});

test("ids are unique per document, deterministic, and plain text safe", () => {
	const chat = [
		paragraph("[A|10:00] one"),
		paragraph("[B|10:01|right|A] two"),
	];
	const context = {};
	const first = messages(ChatComponent({}, chat, context)).map(
		(node) => node.properties.id,
	);
	const second = messages(ChatComponent({}, chat, context)).map(
		(node) => node.properties.id,
	);
	assert.equal(new Set([...first, ...second]).size, 4);

	const fresh = {};
	const again = messages(ChatComponent({}, chat, fresh)).map(
		(node) => node.properties.id,
	);
	assert.deepEqual(again, first);

	const name = messages(
		ChatComponent({}, [paragraph("[<script>x</script>|10:00] hi")], {}),
	)[0].children[0].children.find((node) =>
		className(node).includes("m3-chat__name"),
	);
	assert.equal(name.children[0].type, "text");
});
