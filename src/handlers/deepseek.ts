import { BaseHandler } from "../core/BaseHandler";
import { formatTokenCount } from "../utils/format";
import { fromPreTrained } from "../tokenizers/deepseek";

const BUTTON_ID = "deepseek-token-counter";
const BUTTON_GAP = 8; // Gap between token counter and upload button in pixels
const DEBUG_LOG = false;

export class DeepSeekHandler extends BaseHandler {
    private tokenizer: any = null;
    private containerEl: HTMLElement | null = null;
    private labelSpan: HTMLSpanElement | null = null;
    private timer: number | null = null;
    private lastRun = 0;
    private observeTargets: Node[] = [];
    private lastHref = location.href;
    private cachedButtonWidth = 0;
    private uploadButtonRef: HTMLElement | null = null;

    async init() {
        try {
            this.tokenizer = await fromPreTrained();
        } catch (e) {
            console.error("[DeepSeekToken] Failed to load tokenizer:", e);
        }

        this.updateObserverTarget();
        this.scheduleCompute(0);

        // Monitor URL changes for navigation between chats
        const urlCheckTimer = window.setInterval(() => {
            const href = location.href;
            if (href !== this.lastHref) {
                this.lastHref = href;
                this.onUrlChange();
            }
        }, 500);
        this.registerTimer(urlCheckTimer);
    }

    destroy() {
        super.destroy(); // Cleanup timers and observers
        document.getElementById(BUTTON_ID)?.remove();
    }

    private getTextsFromPage(): string[] {
        const texts: string[] = [];

        if (DEBUG_LOG) {
            console.log('[DeepSeekToken] === Starting text extraction ===');
        }

        // DeepSeek main chat area: ._0f72b0b.ds-scroll-area
        // Sidebar uses: ._6d215eb.ds-scroll-area
        const scrollArea = document.querySelector('._0f72b0b.ds-scroll-area');

        if (DEBUG_LOG) {
            console.log('[DeepSeekToken] Main chat scroll area found:', !!scrollArea);
            if (scrollArea) {
                console.log('[DeepSeekToken] Scroll area class:', scrollArea.className);
                console.log('[DeepSeekToken] Scroll area children count:', scrollArea.children.length);
            }
        }

        if (scrollArea) {
            // Conversation content is in .dad65929 elements
            const conversationContainers = scrollArea.querySelectorAll('.dad65929');

            if (DEBUG_LOG) {
                console.log('[DeepSeekToken] Conversation containers (.dad65929) found:', conversationContainers.length);
            }

            conversationContainers.forEach((container, index) => {
                const text = (container.textContent || "").trim();
                if (text) {
                    texts.push(text);
                    if (DEBUG_LOG) {
                        console.log(`[DeepSeekToken] Conversation ${index + 1} (${text.length} chars):`, text.substring(0, 100) + (text.length > 100 ? '...' : ''));
                    }
                }
            });
        }

        // Get input area content
        const inputArea = document.querySelector('textarea[placeholder*="DeepSeek"], textarea');
        if (inputArea) {
            const inputText = (inputArea.textContent || (inputArea as HTMLTextAreaElement).value || "").trim();
            if (inputText) {
                texts.push(inputText);
                if (DEBUG_LOG) {
                    console.log('[DeepSeekToken] Input area text:', inputText);
                }
            }
        }

        if (DEBUG_LOG) {
            console.log('[DeepSeekToken] Total texts extracted:', texts.length);
            console.log('[DeepSeekToken] Total characters:', texts.join('').length);
        }

        return texts.filter(Boolean);
    }

    private ensureUiMounted() {
        // Find the upload button as reference for positioning
        const uploadButton = document.querySelector('._57370c5._5dedc1e.ds-icon-button') as HTMLElement;

        if (!uploadButton) {
            return;
        }

        // Check if button already exists
        const existing = document.getElementById(BUTTON_ID);
        if (existing) {
            this.containerEl = existing as HTMLElement;
            this.labelSpan = existing.querySelector(".token-label");
            this.uploadButtonRef = uploadButton;
            this.updateButtonPosition();
            return;
        }

        // Create button matching DeepSeek's style
        const button = document.createElement("div");
        button.id = BUTTON_ID;
        button.className = "_57370c5 _5dedc1e ds-icon-button ds-icon-button--l";
        button.setAttribute("tabindex", "0");
        button.setAttribute("role", "button");
        button.setAttribute("aria-disabled", "false");

        // Style overrides for pill shape
        button.style.position = 'fixed';
        button.style.zIndex = '1000';
        button.style.cssText += 'border-radius: 20px !important; overflow: hidden !important; width: auto !important; height: 34px !important; min-width: fit-content !important; max-width: max-content !important; display: inline-flex !important; align-items: center !important;';

        // Hover background (pill-shaped, not circular)
        const hoverBg = document.createElement("div");
        hoverBg.className = "ds-text-button__hover-bg";
        hoverBg.style.cssText = `
            width: 100%;
            height: 100%;
            z-index: 0;
            background-color: transparent;
            border-radius: 20px;
            transition: background-color 0.2s;
            position: absolute;
            top: 0;
            left: 0;
        `;

        // Token count label
        const label = document.createElement("div");
        label.className = "token-label";

        // Detect theme by checking the computed color of the upload button
        const updateLabelColor = () => {
            const uploadButtonColor = window.getComputedStyle(uploadButton).color;
            // If upload button is light colored (rgb values > 128), it's dark mode
            const rgb = uploadButtonColor.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
                const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
                label.style.color = brightness > 128 ? '#e3e3e3' : '#1f2329';
            } else {
                // Fallback to black for light mode
                label.style.color = '#1f2329';
            }
        };

        label.style.cssText = `
            padding: 0 12px;
            font-size: 14px;
            font-weight: 500;
            white-space: nowrap;
            position: relative;
            z-index: 1;
        `;
        label.textContent = "0 tokens";
        this.labelSpan = label;

        // Set initial color
        updateLabelColor();

        // Focus ring
        const focusRing = document.createElement("div");
        focusRing.className = "ds-focus-ring";

        button.appendChild(hoverBg);
        button.appendChild(label);
        button.appendChild(focusRing);

        this.containerEl = button;
        this.uploadButtonRef = uploadButton;

        document.body.appendChild(button);

        // Hover effect
        button.addEventListener('mouseenter', () => {
            hoverBg.style.backgroundColor = 'var(--ds-icon-button-hover-color, rgba(0, 0, 0, 0.05))';
        });
        button.addEventListener('mouseleave', () => {
            hoverBg.style.backgroundColor = 'transparent';
        });

        // Watch for theme changes by observing the upload button's color
        const themeObserver = new MutationObserver(() => {
            updateLabelColor();
        });

        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'data-theme', 'style'],
            subtree: true
        });

        // Initial positioning
        let cachedButtonWidth = 0;
        requestAnimationFrame(() => {
            const uploadRect = uploadButton.getBoundingClientRect();
            cachedButtonWidth = button.offsetWidth;
            button.style.left = `${uploadRect.left - cachedButtonWidth - BUTTON_GAP}px`;
            button.style.top = `${uploadRect.top}px`;
        });

        // Update position on scroll/resize
        const updatePosition = () => {
            const uploadRect = uploadButton.getBoundingClientRect();
            button.style.left = `${uploadRect.left - cachedButtonWidth - BUTTON_GAP}px`;
            button.style.top = `${uploadRect.top}px`;
        };

        window.addEventListener('scroll', updatePosition, { passive: true });
        window.addEventListener('resize', updatePosition, { passive: true });
    }

    private updateButtonPosition() {
        if (!this.containerEl || !this.uploadButtonRef) return;

        // Recalculate button width when content changes
        this.cachedButtonWidth = this.containerEl.offsetWidth;

        // Update position
        const uploadRect = this.uploadButtonRef.getBoundingClientRect();
        this.containerEl.style.left = `${uploadRect.left - this.cachedButtonWidth - BUTTON_GAP}px`;
        this.containerEl.style.top = `${uploadRect.top}px`;
    }

    private scheduleCompute(delay = 200) {
        if (this.timer) clearTimeout(this.timer);
        this.timer = window.setTimeout(() => this.computeAndRender(), delay);
    }

    private async computeAndRender() {
        try {
            const now = performance.now();
            if (now - this.lastRun < 100) return;
            this.lastRun = now;

            this.ensureUiMounted();
            if (!this.labelSpan) return;

            const texts = this.getTextsFromPage();
            let totalTokens = 0;

            if (this.tokenizer) {
                if (DEBUG_LOG) {
                    console.log('[DeepSeekToken] === Starting token counting ===');
                    console.log('[DeepSeekToken] Number of text segments:', texts.length);
                }

                for (const text of texts) {
                    if (text) {
                        try {
                            const encoded = this.tokenizer.encode(text);
                            if (encoded && encoded.ids) {
                                const tokenCount = encoded.ids.length;
                                totalTokens += tokenCount;
                                if (DEBUG_LOG) {
                                    console.log(`[DeepSeekToken] Encoded ${text.length} chars -> ${tokenCount} tokens`);
                                }
                            } else if (Array.isArray(encoded)) {
                                totalTokens += encoded.length;
                                if (DEBUG_LOG) {
                                    console.log(`[DeepSeekToken] Encoded ${text.length} chars -> ${encoded.length} tokens (array format)`);
                                }
                            } else {
                                console.warn('[DeepSeekToken] Unexpected encode result:', encoded);
                            }
                        } catch (err) {
                            console.error('[DeepSeekToken] Error encoding text:', err);
                        }
                    }
                }

                if (DEBUG_LOG) {
                    console.log('[DeepSeekToken] === Token counting complete ===');
                    console.log('[DeepSeekToken] Total tokens:', totalTokens);
                }
            } else {
                this.labelSpan.textContent = "Loading...";
                return;
            }

            // Update label
            this.labelSpan.textContent = formatTokenCount(totalTokens);

            // Update position after text change
            this.updateButtonPosition();
        } catch (e) {
            console.error("[DeepSeekToken] error:", e);
            if (this.labelSpan) this.labelSpan.textContent = "Error";
        }
    }

    private getObserveTargets(): Node[] {
        const main = document.querySelector("main");
        const body = document.body;
        const targets: Node[] = [body];
        if (main) targets.push(main);
        return targets;
    }

    private updateObserverTarget() {
        const newTargets = this.getObserveTargets();
        const same =
            this.observeTargets.length === newTargets.length &&
            newTargets.every((t, idx) => this.observeTargets[idx] === t);
        if (same) return;

        this.observeTargets = newTargets;

        const mo = new MutationObserver(() => {
            this.scheduleCompute(0);
            this.updateObserverTarget();
        });
        this.registerObserver(mo);

        this.observeTargets.forEach((t) =>
            mo.observe(t, {
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
