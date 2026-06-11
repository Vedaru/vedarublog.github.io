declare const CryptoJS: typeof import("crypto-js");

const VERIFY_PREFIX = "MIZUKI-VERIFY:";

export interface PasswordProtectionMessages {
	unlocking: string;
	incorrect: string;
	decryptError: string;
	unlock: string;
	passwordRequired: string;
	decryptionError: string;
	decryptRetry: string;
}

export async function loadCryptoLibraries(): Promise<void> {
	if (typeof CryptoJS !== "undefined") return;

	await new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = "/assets/js/crypto-js.min.js";
		script.onload = () => resolve();
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

export function decryptEncryptedContent(
	encryptedContent: string,
	password: string,
): { ok: true; content: string } | { ok: false; reason: "invalid" | "empty" } {
	const decryptedBytes = CryptoJS.AES.decrypt(encryptedContent, password);
	const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);

	if (!decryptedString || !decryptedString.startsWith(VERIFY_PREFIX)) {
		return { ok: false, reason: "invalid" };
	}

	return {
		ok: true,
		content: decryptedString.replace(VERIFY_PREFIX, ""),
	};
}

export async function executeScriptsInContainer(
	container: HTMLElement,
): Promise<void> {
	const scripts = container.querySelectorAll("script");
	const scriptPromises = Array.from(scripts).map((script) => {
		return new Promise<void>((resolve) => {
			const newScript = document.createElement("script");
			if (script.type) {
				newScript.type = script.type;
			}
			newScript.textContent = script.textContent;
			newScript.onload = () => resolve();
			newScript.onerror = () => resolve();
			script.parentNode?.replaceChild(newScript, script);
			if (!newScript.src) {
				resolve();
			}
		});
	});

	await Promise.all(scriptPromises);
}

export async function runPostDecryptHandlers(
	contentDiv: HTMLElement,
): Promise<void> {
	if (window.hljs) {
		contentDiv.querySelectorAll("pre code").forEach((block) => {
			window.hljs!.highlightElement(block as HTMLElement);
		});
	}

	const tocElement = document.querySelector("table-of-contents");
	if (tocElement && typeof tocElement.regenerateTOC === "function") {
		tocElement.regenerateTOC();
		tocElement.init?.();
	}

	if (typeof window.mobileTOCInit === "function") {
		window.mobileTOCInit();
	}

	if (window.Fancybox?.bind) {
		window.Fancybox.unbind("[data-fancybox]");
		window.Fancybox.bind("[data-fancybox]", {});
	}

	if (window.location.hash) {
		const targetId = window.location.hash.substring(1);
		const targetElement = document.getElementById(targetId);
		if (targetElement) {
			targetElement.scrollIntoView({ behavior: "smooth" });
		}
	}

	const images = contentDiv.querySelectorAll("img");
	images.forEach((img) => {
		if (!img.complete) {
			img.addEventListener("load", () => {
				window.dispatchEvent(new Event("scroll"));
				window.dispatchEvent(new Event("resize"));
			});
		}
	});

	[0, 100, 300, 500, 1000, 2000].forEach((delay) => {
		setTimeout(() => {
			window.dispatchEvent(new Event("scroll"));
			window.dispatchEvent(new Event("resize"));
		}, delay);
	});

	if (typeof window.renderMermaidDiagrams === "function") {
		await new Promise((resolve) => setTimeout(resolve, 100));
		window.renderMermaidDiagrams();
	}
}

export function revealDecryptedContent(contentDiv: HTMLElement): void {
	const shareComponent = document.getElementById("share-component");
	const licenseComponent = document.getElementById("license-component");
	if (shareComponent) {
		shareComponent.classList.remove("encrypted-hidden");
	}
	if (licenseComponent) {
		licenseComponent.classList.remove("encrypted-hidden");
	}

	contentDiv.style.display = "block";
}

export function getSavedPassword(pathname: string): string | null {
	return sessionStorage.getItem("page-password-" + pathname);
}

export function savePassword(pathname: string, password: string): void {
	sessionStorage.setItem("page-password-" + pathname, password);
}

export function clearSavedPassword(pathname: string): void {
	sessionStorage.removeItem("page-password-" + pathname);
}

export interface InitPasswordProtectionOptions {
	encryptedContent: string;
	messages: PasswordProtectionMessages;
}

export async function initPasswordProtection({
	encryptedContent,
	messages,
}: InitPasswordProtectionOptions): Promise<void> {
	const savedPassword = getSavedPassword(window.location.pathname);
	const protectionDiv = document.getElementById("password-protection");

	if (savedPassword && protectionDiv) {
		const inputGroup = protectionDiv.querySelector(".password-input-group");
		if (inputGroup instanceof HTMLElement) {
			inputGroup.style.visibility = "hidden";
		}
		const hint = protectionDiv.querySelector(".password-container p");
		if (hint) {
			hint.setAttribute("data-original-text", hint.textContent ?? "");
			hint.textContent = messages.unlocking;
		}
		protectionDiv.classList.add("auto-unlocking");
	}

	await loadCryptoLibraries();

	const passwordInput = document.getElementById(
		"password-input",
	) as HTMLInputElement | null;
	const unlockBtn = document.getElementById(
		"unlock-btn",
	) as HTMLButtonElement | null;
	const errorMessage = document.getElementById("error-message");
	const contentDiv = document.getElementById("decrypted-content");

	if (!passwordInput || !unlockBtn || !errorMessage || !contentDiv) return;

	function showError(message: string) {
		errorMessage!.textContent = message;
		errorMessage!.style.display = "block";
		if (!protectionDiv?.classList.contains("auto-unlocking")) {
			passwordInput!.focus();
		}
	}

	async function attemptUnlock() {
		const inputPassword = passwordInput!.value.trim() || savedPassword;

		if (!inputPassword) {
			showError(messages.passwordRequired);
			return;
		}

		unlockBtn!.disabled = true;
		unlockBtn!.textContent = messages.unlocking;
		errorMessage!.style.display = "none";

		try {
			const result = decryptEncryptedContent(
				encryptedContent,
				inputPassword,
			);

			if (!result.ok) {
				showError(messages.incorrect);
				if (savedPassword) {
					clearSavedPassword(window.location.pathname);
					const inputGroup = protectionDiv?.querySelector(
						".password-input-group",
					);
					if (inputGroup instanceof HTMLElement) {
						inputGroup.style.visibility = "visible";
					}
					const hint = protectionDiv?.querySelector(
						".password-container p",
					);
					if (hint?.hasAttribute("data-original-text")) {
						hint.textContent =
							hint.getAttribute("data-original-text");
					}
					passwordInput!.value = "";
					protectionDiv?.classList.remove("auto-unlocking");
				}
				return;
			}

			contentDiv!.innerHTML = result.content;
			await executeScriptsInContainer(contentDiv!);

			if (protectionDiv?.parentNode) {
				protectionDiv.remove();
			}

			revealDecryptedContent(contentDiv!);
			savePassword(window.location.pathname, inputPassword);

			setTimeout(() => {
				void runPostDecryptHandlers(contentDiv!);
			}, 50);
		} catch (error) {
			console.error(messages.decryptionError, error);
			showError(messages.decryptRetry);
		} finally {
			unlockBtn!.disabled = false;
			unlockBtn!.textContent = messages.unlock;
		}
	}

	unlockBtn.addEventListener("click", () => void attemptUnlock());
	passwordInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") void attemptUnlock();
	});

	if (savedPassword) {
		void attemptUnlock();
	} else {
		passwordInput.focus();
	}
}

export function initEncryptedCopyHandler(): void {
	document.addEventListener("click", (e: MouseEvent) => {
		const target = e.target as HTMLElement | null;
		if (!target) return;

		const btn = target.closest(".copy-btn");
		if (!btn) return;

		const codeEle = btn.parentElement?.querySelector("code");
		if (!codeEle) return;

		let code = "";
		const lineElements = codeEle.querySelectorAll("span.line");
		if (lineElements.length > 0) {
			const lines: string[] = [];
			for (let i = 0; i < lineElements.length; i++) {
				lines.push(lineElements[i].textContent || "");
			}
			code = lines.join("\n");
		} else {
			const codeElements = codeEle.querySelectorAll(
				".code:not(summary *)",
			);
			if (codeElements.length > 0) {
				const lines: string[] = [];
				for (let i = 0; i < codeElements.length; i++) {
					lines.push(codeElements[i].textContent || "");
				}
				code = lines.join("\n");
			} else {
				code = codeEle.textContent || "";
			}
		}

		code = code.replace(/\n{3,}/g, (match) => {
			const emptyLineCount = match.length - 1;
			const resultEmptyLines = Math.ceil(emptyLineCount / 2);
			return "\n".repeat(resultEmptyLines + 1);
		});

		const copyToClipboard = async (text: string) => {
			try {
				await navigator.clipboard.writeText(text);
			} catch (clipboardErr) {
				console.warn(
					"Clipboard API failed. Try the alternative plan:",
					clipboardErr,
				);
				const textArea = document.createElement("textarea");
				textArea.value = text;
				textArea.style.position = "fixed";
				textArea.style.left = "-999999px";
				textArea.style.top = "-999999px";
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				try {
					document.execCommand("copy");
				} catch (execErr) {
					console.error("execCommand failed:", execErr);
				} finally {
					document.body.removeChild(textArea);
				}
			}
		};

		copyToClipboard(code)
			.then(() => {
				const timeoutId = btn.getAttribute("data-timeout-id");
				if (timeoutId) {
					clearTimeout(parseInt(timeoutId));
				}

				btn.classList.add("success");

				const newTimeoutId = setTimeout(() => {
					btn.classList.remove("success");
				}, 1000);

				btn.setAttribute("data-timeout-id", newTimeoutId.toString());
			})
			.catch((err) => {
				console.error("copy failed:", err);
			});
	});
}
