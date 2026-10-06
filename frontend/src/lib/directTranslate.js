// Fallback used only when the backend can't translate (e.g. it is still running an old version):
// the phone asks MyMemory itself. Free, no key; each phone has its own daily allowance.
// The backend stays the normal path because it caches translations for everyone in the database.

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const MAX_BYTES = 480; // MyMemory accepts up to 500 bytes per text
const PARALLEL = 6;

// App language codes (FLORES-200) → ISO codes.
const ISO = {
  eng_Latn: "en",
  hin_Deva: "hi",
  tam_Taml: "ta",
  tel_Telu: "te",
  kan_Knda: "kn",
  mal_Mlym: "ml",
  ben_Beng: "bn",
  mar_Deva: "mr",
  guj_Gujr: "gu",
  pan_Guru: "pa",
  ory_Orya: "or",
  asm_Beng: "as",
};

// Language of typed text, guessed from its script (Devanagari is read as Hindi).
const SCRIPTS = [
  [/[ऀ-ॿ]/, "hi"],
  [/[ঀ-৿]/, "bn"],
  [/[਀-੿]/, "pa"],
  [/[઀-૿]/, "gu"],
  [/[଀-୿]/, "or"],
  [/[஀-௿]/, "ta"],
  [/[ఀ-౿]/, "te"],
  [/[ಀ-೿]/, "kn"],
  [/[ഀ-ൿ]/, "ml"],
];

const sourceOf = (text) => (SCRIPTS.find(([pattern]) => pattern.test(text)) || [null, "en"])[1];
const bytes = (text) => encodeURIComponent(text).replace(/%[0-9A-F]{2}/g, "x").length;

// Splits text longer than MAX_BYTES at spaces.
function pieces(text) {
  if (bytes(text) <= MAX_BYTES) return [text];
  const parts = [];
  let current = "";
  text.split(" ").forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (current && bytes(candidate) > MAX_BYTES) {
      parts.push(current);
      current = word;
    } else {
      current = candidate;
    }
  });
  if (current) parts.push(current);
  return parts;
}

const decode = (text) =>
  text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

async function translateOne(text, language) {
  const source = sourceOf(text);
  const target = ISO[language];
  if (!target || source === target) return text;

  const out = [];
  for (const piece of pieces(text)) {
    const url = `${MYMEMORY_URL}?q=${encodeURIComponent(piece)}&langpair=${source}|${target}`;
    const response = await fetch(url);
    const body = await response.json();
    const translated = decode(String(body?.responseData?.translatedText || ""));
    if (String(body?.responseStatus) !== "200" || !translated || translated.includes("MYMEMORY WARNING")) {
      throw new Error(`MyMemory answered ${body?.responseStatus}`);
    }
    out.push(translated);
  }
  return out.join(" ");
}

// Returns { text: translated } for every text it could translate (failures are left out).
export default async function directTranslate(texts, language) {
  const result = {};
  for (let start = 0; start < texts.length; start += PARALLEL) {
    const batch = texts.slice(start, start + PARALLEL);
    const settled = await Promise.allSettled(batch.map((text) => translateOne(text, language)));
    settled.forEach((outcome, index) => {
      if (outcome.status === "fulfilled") result[batch[index]] = outcome.value;
    });
  }
  return result;
}
