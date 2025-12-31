import { TokenizerLoader } from "@lenml/tokenizers";

let cachedTokenizer: any = null;

export async function fromPreTrained(): Promise<any> {
    if (cachedTokenizer) return cachedTokenizer;

    try {
        // Load both tokenizer.json and tokenizer_config.json
        const tokenizerJSONPath = chrome.runtime.getURL("src/tokenizers/deepseek/tokenizer.json");
        const tokenizerConfigPath = chrome.runtime.getURL("src/tokenizers/deepseek/tokenizer_config.json");

        const [tokenizerJSONResponse, tokenizerConfigResponse] = await Promise.all([
            fetch(tokenizerJSONPath),
            fetch(tokenizerConfigPath)
        ]);

        const tokenizerJSON = await tokenizerJSONResponse.json();
        const tokenizerConfig = await tokenizerConfigResponse.json();

        // Load tokenizer with both required parameters
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
