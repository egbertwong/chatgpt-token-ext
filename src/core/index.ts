import { ChatGPTHandler } from "../handlers/chatgpt";
import { GeminiHandler } from "../handlers/gemini";
import { DeepSeekHandler } from "../handlers/deepseek";
import { TokenHandler } from "./types";

export function getHandler(): TokenHandler | null {
    const host = window.location.hostname;
    if (host.includes("chatgpt.com") || host.includes("chat.openai.com")) {
        return new ChatGPTHandler();
    }
    if (host.includes("gemini.google.com")) {
        return new GeminiHandler();
    }
    if (host.includes("chat.deepseek.com")) {
        return new DeepSeekHandler();
    }
    return null;
}

export function start() {
    const handler = getHandler();
    if (handler) {
        handler.init();
        console.log(`[TokenCounter] Started handler for ${window.location.hostname}`);
    } else {
        console.warn(`[TokenCounter] No handler found for ${window.location.hostname}`);
    }
}
