import { h } from "hastscript";

/**
 * `:::chat` transcript renderer.
 *
 * Author syntax:
 *
 *   :::chat
 *   ((Alice joined the chat))
 *   [[2026-02-23]]
 *
 *   [Alice|10:00]
 *   Hello **there**
 *
 *   [Bob|10:01|right|Alice]
 *   Replying to Alice.
 *   :::
 *
 * A paragraph starting with `[user|time]` opens a message; the optional third
 * field is `left`/`right` and the fourth is the reply target. Everything until
 * the next header belongs to the message. `[[date]]` is a divider and
 * `((text))` is a centered system note.
 *
 * `:::chat{names=both}` labels both sides; `names=none` hides every visible
 * name. Consecutive messages from the same sender, on the same side, within
 * 121 seconds (Telegram Web K's grouping window) are merged into one visual
 * group. Names and reply quotes use a deterministic seven-colour peer palette,
 * and a quote takes the colour of the message it quotes.
 *
 * Everything is computed at build time, so the client ships no JavaScript.
 */

// [user|time], [user|time|right], [user|time|left|replyTo], [user|time||replyTo]
// The header must end at whitespace or the end of the paragraph, so a normal
// Markdown link that happens to contain a pipe is not mistaken for one.
const HEADER =
	/^\[([^|\]\n]+)\|([^|\]\n]+)(?:\|([^|\]\n]*))?(?:\|([^\]\n]+))?\](?=\s|$)/;
const POSITIONS = new Map([
	["", "start"],
	["left", "start"],
	["right", "end"],
]);
const NAME_MODES = new Set(["auto", "start", "both", "all", "none"]);
const DIVIDER = /^\[\[([^[\]\n]+)\]\]$/;
const DATE_TIME =
	/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const TIME = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Telegram Web K groups same-sender messages up to 121 seconds apart. */
const GROUP_WINDOW_SECONDS = 121;

/** Telegram's peer-colour palette size (names and reply quotes). */
const PEER_COLOR_COUNT = 7;

/** Elements that should contribute a space when flattened for a quote. */
const BLOCK_TAGS = new Set(["p", "li", "blockquote", "pre"]);

/** Per-document chat ordinal, so two identical blocks still get unique ids. */
const chatCounts = new WeakMap();

function isBlank(node) {
	return node.type === "text" && !node.value.trim();
}

function warn(context, message) {
	context?.vfile?.message?.(`[chat] ${message}`);
}

/** Canonical form, so NFC and NFD spellings get the same colour and match. */
function normalizeName(name) {
	return name.normalize("NFC");
}

function isValidTime(hours, minutes, seconds = "00") {
	return Number(hours) < 24 && Number(minutes) < 60 && Number(seconds) < 60;
}

/** FNV-1a; keeps rendered ids and peer colours stable across rebuilds. */
function hashValue(input) {
	let hash = 2166136261;
	for (let index = 0; index < input.length; index++) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function hashString(input) {
	return hashValue(input).toString(36);
}

function peerClass(name) {
	return `m3-chat__peer--${hashValue(normalizeName(name)) % PEER_COLOR_COUNT}`;
}

/** Flattens HAST content to the text Telegram's reply preview would quote. */
function toPlainText(nodes) {
	let text = "";

	const visit = (node) => {
		if (node.type === "text") {
			text += node.value;
			return;
		}
		if (node.type !== "element") return;
		if (node.tagName === "br") text += " ";
		for (const child of node.children ?? []) visit(child);
		if (BLOCK_TAGS.has(node.tagName)) {
			text += " ";
		}
	};

	for (const node of nodes) visit(node);
	return text.replace(/\s+/g, " ").trim();
}

function truncate(text, max) {
	if (text.length <= max) return text;
	return `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Parses `HH:mm[:ss]`, `YYYY-MM-DD` or `YYYY-MM-DD HH:mm[:ss]` into the
 * normalized `<time datetime>` value plus the pieces grouping needs.
 * Free text and impossible dates (2026-02-30) yield nulls.
 */
export function parseTimestamp(text) {
	const time = text.match(TIME);
	if (time) {
		const [, hours, minutes, seconds = "00"] = time;
		if (!isValidTime(hours, minutes, seconds)) {
			return { datetime: null, seconds: null, dateKey: null };
		}
		return {
			datetime: text,
			seconds:
				Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds),
			dateKey: null,
		};
	}

	const match = text.match(DATE_TIME);
	if (!match) return { datetime: null, seconds: null, dateKey: null };

	const [, year, month, day, hours, minutes, seconds] = match;
	const date = new Date(Date.UTC(year, month - 1, day));
	if (
		date.getUTCFullYear() !== Number(year) ||
		date.getUTCMonth() !== month - 1 ||
		date.getUTCDate() !== Number(day)
	) {
		return { datetime: null, seconds: null, dateKey: null };
	}

	const dateKey = `${year}-${month}-${day}`;
	if (hours === undefined) {
		return { datetime: dateKey, seconds: null, dateKey };
	}
	if (!isValidTime(hours, minutes, seconds)) {
		return { datetime: null, seconds: null, dateKey };
	}

	return {
		datetime: `${dateKey}T${hours}:${minutes}${seconds ? `:${seconds}` : ""}`,
		seconds:
			Number(hours) * 3600 +
			Number(minutes) * 60 +
			Number(seconds ?? "00"),
		dateKey,
	};
}

function renderTime(className, text) {
	const { datetime } = parseTimestamp(text);
	if (!datetime) return h("span", { class: className }, text);
	return h("time", { class: className, datetime }, text);
}

function readDivider(node) {
	if (node.type !== "element" || node.tagName !== "p") return null;
	if (node.children.length !== 1 || node.children[0].type !== "text") {
		return null;
	}
	const label = node.children[0].value.trim().match(DIVIDER)?.[1].trim();
	return label || null;
}

/** Reads `((Bob left))` and returns its inner nodes, parentheses removed. */
function readNote(node) {
	if (node.type !== "element" || node.tagName !== "p") return null;
	const children = node.children;

	const firstIndex = children.findIndex((child) => child.type === "text");
	if (firstIndex === -1) return null;
	if (!children[firstIndex].value.trimStart().startsWith("((")) return null;

	let lastIndex = -1;
	for (let index = children.length - 1; index >= 0; index--) {
		if (children[index].type === "text") {
			lastIndex = index;
			break;
		}
	}
	if (lastIndex === -1) return null;
	if (!children[lastIndex].value.trimEnd().endsWith("))")) return null;

	const inner = children.map((child) => ({ ...child }));
	inner[firstIndex].value = inner[firstIndex].value.trimStart().slice(2);
	inner[lastIndex].value = inner[lastIndex].value.trimEnd().slice(0, -2);

	return inner.some((child) => !isBlank(child)) ? inner : null;
}

/** Splits a `[user|time…]` header off a paragraph, keeping the rest. */
function readHeader(paragraph, context) {
	if (paragraph.type !== "element" || paragraph.tagName !== "p") return null;
	const [first, ...rest] = paragraph.children;
	if (first?.type !== "text") return null;

	const match = first.value.match(HEADER);
	if (!match) return null;

	const [, username, timestamp, rawPosition = "", replyTo] = match;
	const positionKey = rawPosition.trim().toLowerCase();
	if (!POSITIONS.has(positionKey)) {
		warn(context, `unknown position "${rawPosition}", using "left"`);
	}

	const remainder = first.value.slice(match[0].length).replace(/^\s+/, "");
	const inline = remainder
		? [{ type: "text", value: remainder }, ...rest]
		: rest;

	const timestampText = timestamp.trim();
	const replyToName = replyTo?.trim();

	return {
		type: "message",
		username: normalizeName(username.trim()),
		timestamp: timestampText,
		stamp: parseTimestamp(timestampText),
		side: POSITIONS.get(positionKey) ?? "start",
		replyTo: replyToName ? normalizeName(replyToName) : null,
		content: inline.some((node) => !isBlank(node)) ? [h("p", inline)] : [],
	};
}

function readNameMode(properties, context) {
	const requested = String(properties?.names ?? "auto")
		.trim()
		.toLowerCase();
	if (!NAME_MODES.has(requested)) {
		warn(context, `unknown names mode "${requested}", using "auto"`);
		return "auto";
	}
	return requested;
}

function canGroup(previous, current) {
	if (!previous || !current) return false;
	if (previous.type !== "message" || current.type !== "message") return false;
	if (previous.side !== current.side) return false;
	if (previous.username !== current.username) return false;
	if (previous.stamp.seconds === null || current.stamp.seconds === null) {
		return false;
	}
	if (previous.stamp.dateKey !== current.stamp.dateKey) return false;
	return (
		Math.abs(previous.stamp.seconds - current.stamp.seconds) <=
		GROUP_WINDOW_SECONDS
	);
}

function collectEntries(children, context) {
	const entries = [];
	const pendingNotes = [];
	let message = null;

	const flushNotes = () => {
		if (pendingNotes.length) {
			entries.push({ type: "note", children: pendingNotes.splice(0) });
		}
	};

	for (const child of Array.isArray(children) ? children : []) {
		if (isBlank(child)) continue;

		const divider = readDivider(child);
		if (divider) {
			flushNotes();
			message = null;
			entries.push({ type: "divider", label: divider });
			continue;
		}

		const note = readNote(child);
		if (note) {
			flushNotes();
			message = null;
			entries.push({ type: "note", children: [h("p", note)] });
			continue;
		}

		const header = readHeader(child, context);
		if (header) {
			flushNotes();
			message = header;
			entries.push(message);
		} else if (message) {
			message.content.push(child);
		} else {
			pendingNotes.push(child);
		}
	}
	flushNotes();

	return entries;
}

function markGroups(entries) {
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index];
		if (entry.type !== "message") continue;
		entry.first = !canGroup(entries[index - 1], entry);
		entry.last = !canGroup(entry, entries[index + 1]);
	}
}

function fingerprintEntries(entries) {
	return entries
		.map((entry) => {
			if (entry.type === "message") {
				return [
					"m",
					entry.username,
					entry.timestamp,
					entry.side,
					entry.replyTo ?? "",
					toPlainText(entry.content),
				].join("|");
			}
			if (entry.type === "divider") return `d|${entry.label}`;
			return `n|${toPlainText(entry.children)}`;
		})
		.join("\n");
}

function chatIdFor(entries, context) {
	const documentIndex = context ? (chatCounts.get(context) ?? 0) + 1 : 1;
	if (context) chatCounts.set(context, documentIndex);
	return `m3c-${hashString(fingerprintEntries(entries))}-${documentIndex}`;
}

/**
 * Resolves replies in one pass. The nearest earlier message wins; otherwise
 * the first other message by that sender (which may be below the reply).
 */
function resolveReplyTargets(entries, idFor) {
	const firstTwoByUser = new Map();
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index];
		if (entry.type !== "message") continue;
		const seen = firstTwoByUser.get(entry.username) ?? [];
		if (seen.length < 2) {
			seen.push(index);
			firstTwoByUser.set(entry.username, seen);
		}
	}

	const lastSeenByUser = new Map();
	for (let index = 0; index < entries.length; index++) {
		const entry = entries[index];
		if (entry.type !== "message") continue;

		if (entry.replyTo) {
			let target = lastSeenByUser.get(entry.replyTo);
			if (target === undefined) {
				target = firstTwoByUser
					.get(entry.replyTo)
					?.find((candidate) => candidate !== index);
			}
			if (target !== undefined) {
				entry.replyTargetId = idFor(target);
				entry.replyTargetText = truncate(
					toPlainText(entries[target].content),
					140,
				);
			}
		}

		lastSeenByUser.set(entry.username, index);
	}
}

function renderReply(title, targetId, subtitle) {
	const children = [h("span", { class: "m3-chat__reply-title" }, title)];
	if (subtitle) {
		children.push(
			h("span", { class: "m3-chat__reply-subtitle" }, subtitle),
		);
	}

	const properties = {
		class: `m3-chat__reply ${peerClass(title)}`,
	};
	if (targetId) properties.href = `#${targetId}`;
	return h(targetId ? "a" : "span", properties, children);
}

function renderEntry(entry, index, idFor, names) {
	if (entry.type === "divider") {
		return h("li", { class: "m3-chat__divider", role: "separator" }, [
			renderTime("m3-chat__divider-time", entry.label),
		]);
	}

	if (entry.type === "note") {
		return h("li", { class: "m3-chat__note" }, entry.children);
	}

	const inner = [];
	const showName =
		entry.first && !names.hide && (entry.side === "start" || names.showOwn);
	if (showName) {
		inner.push(h("span", { class: "m3-chat__name" }, entry.username));
	} else {
		inner.push(h("span", { class: "m3-chat__sr" }, `${entry.username}: `));
	}

	if (entry.replyTo) {
		inner.push(
			renderReply(
				entry.replyTo,
				entry.replyTargetId,
				entry.replyTargetText,
			),
		);
	}

	const content = [...entry.content];
	const time = renderTime("m3-chat__time", entry.timestamp);

	// Telegram puts the clock at the end of the last text line. Appending it
	// inside the final paragraph lets the text wrap around it; for block
	// content (lists, code) it falls back to its own right-aligned line.
	const last = content.at(-1);
	if (last?.type === "element" && last.tagName === "p") {
		content[content.length - 1] = {
			...last,
			children: [...last.children, time],
		};
	} else {
		content.push(time);
	}
	inner.push(...content);

	const classes = [
		"m3-chat__msg",
		`m3-chat__msg--${entry.side}`,
		peerClass(entry.username),
		entry.first ? "is-group-first" : "",
		entry.last ? "is-group-last" : "",
	]
		.filter(Boolean)
		.join(" ");

	return h(
		"li",
		{
			class: classes,
			id: idFor(index),
		},
		[h("div", { class: "m3-chat__bubble" }, inner)],
	);
}

export function ChatComponent(properties, children, context) {
	const nameMode = readNameMode(properties, context);
	const entries = collectEntries(children, context);

	if (entries.length === 0) {
		warn(context, "empty :::chat block was not rendered");
		return null;
	}
	if (!entries.some((entry) => entry.type === "message")) {
		warn(context, "no [user|time] message headers found");
	}

	markGroups(entries);

	const chatId = chatIdFor(entries, context);
	const idFor = (index) => `${chatId}-${index}`;
	resolveReplyTargets(entries, idFor);

	const names = {
		showOwn: nameMode === "both" || nameMode === "all",
		hide: nameMode === "none",
	};

	return h(
		"ol",
		{ class: "m3-chat not-prose" },
		entries.map((entry, index) => renderEntry(entry, index, idFor, names)),
	);
}
