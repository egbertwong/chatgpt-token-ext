import { TokenizerLoader } from "@lenml/tokenizers";

let cachedTokenizer: any = null;

/**
 * Load DeepSeek tokenizer from bundled tokenizer.json and tokenizer_config.json files
 * @returns Promise<Tokenizer> - The loaded tokenizer instance
 */
export async function fromPreTrained(): Promise<any> {
    if (cachedTokenizer) return cachedTokenizer;

    try {
        const tokenizerJSONPath = chrome.runtime.getURL("src/tokenizers/deepseek/tokenizer.json");
        const tokenizerConfigPath = chrome.runtime.getURL("src/tokenizers/deepseek/tokenizer_config.json");

        const [tokenizerJSONResponse, tokenizerConfigResponse] = await Promise.all([
            fetch(tokenizerJSONPath),
            fetch(tokenizerConfigPath)
        ]);

        const tokenizerJSON = await tokenizerJSONResponse.json();
        const tokenizerConfig = await tokenizerConfigResponse.json();

        const tokenizer = TokenizerLoader.fromPreTrained({
            tokenizerJSON,
            tokenizerConfig
        });

        cachedTokenizer = tokenizer;
        return tokenizer;
    } catch (e) {
        console.error("[DeepSeekTokenizer] Failed to load tokenizer:", e);
        throw e;
    }
}
