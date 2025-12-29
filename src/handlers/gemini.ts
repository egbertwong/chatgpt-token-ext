import { TokenHandler } from "../core/types";
import { fromPreTrained } from "@lenml/tokenizer-gemini";

const BUTTON_ID = "gemini-token-counter";
const DEBUG_LOG = false;

export class GeminiHandler implements TokenHandler {
    private tokenizer: any = null;
    private containerEl: HTMLDivElement | null = null;
    private labelSpan: HTMLSpanElement | null = null;
    private timer: number | null = null;
    private lastRun = 0;
    private mo: MutationObserver | null = null;
    private observeTargets: Node[] = [];
    private urlCheckTimer: number | null = null;
    private lastHref = location.href;

    async init() {
        try {
            this.tokenizer = await fromPreTrained();
        } catch (e) {
            console.error("[GeminiToken] Failed to load tokenizer:", e);
        }

        this.updateObserverTarget();
        this.scheduleCompute(0);

        this.urlCheckTimer = window.setInterval(() => {
            const href = location.href;
            if (href !== this.lastHref) {
                this.lastHref = href;
                this.onUrlChange();
            }
        }, 500);
    }

    destroy() {
        if (this.urlCheckTimer) clearInterval(this.urlCheckTimer);
        if (this.mo) this.mo.disconnect();
        document.getElementById(BUTTON_ID)?.remove();
    }

    private getTextsFromPage(): string[] {
        const userNodes = document.querySelectorAll("user-query-content");
        const modelNodes = document.querySelectorAll("message-content");

        const texts: string[] = [];

        userNodes.forEach(n => {
            texts.push((n.textContent || "").trim());
        });

        modelNodes.forEach(n => {
            texts.push((n.textContent || "").trim());
        });

        const inputArea = document.querySelector(".ql-editor");
        if (inputArea) {
            texts.push((inputArea.textContent || "").trim());
        }

        return texts.filter(Boolean);
    }

    private ensureUiMounted() {
        const injectionPoint = document.querySelector(".input-area-container");
        if (!injectionPoint) return;

        let existing = document.getElementById(BUTTON_ID);
        if (existing) {
            this.containerEl = existing as HTMLDivElement;
            this.labelSpan = existing.querySelector(".token-label");
            return;
        }

        const container = document.createElement("div");
        container.id = BUTTON_ID;
        container.style.display = "flex";
        container.style.alignItems = "center";
        container.style.padding = "4px 12px";
        container.style.marginLeft = "8px";
        container.style.backgroundColor = "#f0f4f9";
        container.style.borderRadius = "16px";
        container.style.fontFamily = '"Google Sans Flex", "Google Sans", sans-serif';
        container.style.fontSize = "12px";
        container.style.color = "#444746";
        container.style.border = "1px solid #c4c7c5";
        container.style.cursor = "default";
        container.style.userSelect = "none";
        container.style.transition = "background-color 0.2s";

        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            container.style.backgroundColor = "#1e1f20";
            container.style.color = "#e3e3e3";
            container.style.borderColor = "#444746";
        }

        const icon = document.createElement("span");
        icon.textContent = "✧";
        icon.style.marginRight = "6px";
        icon.style.color = "#1a73e8";

        const label = document.createElement("span");
        label.className = "token-label";
        label.textContent = "0 tokens";
        this.labelSpan = label;

        container.appendChild(icon);
        container.appendChild(label);
        this.containerEl = container;

        const micBtn = injectionPoint.querySelector(".speech_dictation_mic_button") ||
            injectionPoint.querySelector("button[aria-label*='Voice']");
        if (micBtn && micBtn.parentElement) {
            micBtn.parentElement.insertBefore(container, micBtn);
        } else {
            injectionPoint.appendChild(container);
        }
    }

    private scheduleCompute(delay = 200) {
        if (this.timer) clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.computeAndRender(), delay);
    }

    private computeAndRender() {
        try {
            const now = performance.now();
            if (now - this.lastRun < 100) return;
            this.lastRun = now;

            this.ensureUiMounted();
            if (!this.labelSpan) return;

            const texts = this.getTextsFromPage();
            let totalTokens = 0;

            if (this.tokenizer) {
                for (const t of texts) {
                    totalTokens += this.tokenizer.encode(t).length;
                }
            } else {
                this.labelSpan.textContent = "Loading...";
                return;
            }

            if (totalTokens >= 1000) {
                this.labelSpan.textContent = `${(totalTokens / 1000).toFixed(1)}k tokens`;
            } else {
                this.labelSpan.textContent = `${totalTokens} tokens`;
            }

            if (DEBUG_LOG) {
                const totalChars = texts.join("").length;
                console.log(`[GeminiToken] Tokens: ${totalTokens}, Chars: ${totalChars}`);
            }
        } catch (e) {
            console.error("[GeminiToken] error:", e);
            if (this.labelSpan) this.labelSpan.textContent = "Error";
        }
    }

    private getObserveTargets(): Node[] {
        const history = document.querySelector("#chat-history");
        const input = document.querySelector(".input-area-container");
        const targets: Node[] = [document.body];
        if (history) targets.push(history);
        if (input) targets.push(input);
        return targets;
    }

    private updateObserverTarget() {
        const newTargets = this.getObserveTargets();
        const same =
            this.observeTargets.length === newTargets.length &&
            newTargets.every((t, idx) => this.observeTargets[idx] === t);
        if (same) return;

        this.observeTargets = newTargets;
        if (this.mo) this.mo.disconnect();

        this.mo = new MutationObserver(() => {
            this.scheduleCompute(0);
            this.updateObserverTarget();
        });

        this.observeTargets.forEach((t) =>
            this.mo!.observe(t, {
                childList: true,
                subtree: true,
                characterData: true,
            })
        );
    }

    private onUrlChange() {
        this.containerEl = null;
        this.labelSpan = null;
        document.getElementById(BUTTON_ID)?.remove();
        this.updateObserverTarget();
        this.scheduleCompute(0);
    }
}
