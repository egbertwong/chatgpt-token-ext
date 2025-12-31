import path from "node:path";
import { fileURLToPath } from "node:url";
import { Tokenizer } from "@huggingface/tokenizers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TOKENIZER_PATH = path.join(__dirname, "tokenizer.json");

const SPECIAL_TOKENS = {
  bos: "<｜begin▁of▁sentence｜>",
  eos: "<｜end▁of▁sentence｜>",
  pad: "<｜end▁of▁sentence｜>",
};

let cachedTokenizer = null;
let cachedSpecialTokenIds = null;

async function loadTokenizer(tokenizerPath = DEFAULT_TOKENIZER_PATH) {
  if (cachedTokenizer) return cachedTokenizer;

  const tokenizer = await Tokenizer.fromFile(tokenizerPath);
  tokenizer.setSpecialTokens(SPECIAL_TOKENS);
  cachedTokenizer = tokenizer;
  return tokenizer;
}

async function getSpecialTokenIds() {
  if (cachedSpecialTokenIds) return cachedSpecialTokenIds;

  const tokenizer = await loadTokenizer();
  cachedSpecialTokenIds = {
    bos: tokenizer.tokenToId(SPECIAL_TOKENS.bos),
    eos: tokenizer.tokenToId(SPECIAL_TOKENS.eos),
    pad: tokenizer.tokenToId(SPECIAL_TOKENS.pad),
  };
  return cachedSpecialTokenIds;
}

export async function encode(text, { addBos = false, addEos = false } = {}) {
  const tokenizer = await loadTokenizer();
  const specialIds = await getSpecialTokenIds();
  const encoded = tokenizer.encode(text);

  const ids = [];
  if (addBos && specialIds.bos !== undefined && specialIds.bos !== null) {
    ids.push(specialIds.bos);
  }
  ids.push(...encoded.ids);
  if (addEos && specialIds.eos !== undefined && specialIds.eos !== null) {
    ids.push(specialIds.eos);
  }

  return {
    ids,
    tokens: tokenizer.idToToken
      ? ids.map((id) => tokenizer.idToToken(id) ?? `<unk:${id}>`)
      : encoded.tokens,
  };
}

export async function decode(ids, { skipSpecialTokens = false } = {}) {
  const tokenizer = await loadTokenizer();
  return tokenizer.decode(ids, { skipSpecialTokens });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  (async () => {
    const input = process.argv.slice(2).join(" ") || "Hello!";
    const tokenizer = await loadTokenizer();
    const encoded = tokenizer.encode(input);

    console.log("Input:", input);
    console.log("Token IDs:", encoded.ids);
    console.log("Tokens:", encoded.tokens);
    console.log("Decoded:", tokenizer.decode(encoded.ids));
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
