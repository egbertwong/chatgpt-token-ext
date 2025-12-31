export interface TokenHandler {
    init(): void;
    destroy(): void;
}

export type ModelType = "chatgpt" | "gemini" | "deepseek";
