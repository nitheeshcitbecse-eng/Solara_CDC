import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/api";

// The app is written in English. Other languages come from the backend (POST /i18n/translate), which
// asks its translator (Azure AI Translator, or NLLB-200 locally) and caches every translation in the
// database. Text people typed in an Indian script (job posts, chat) is translated too, also into English.
// The phone keeps its own copy per language in AsyncStorage, so a language loads instantly the second time.

export const SOURCE_LANGUAGE = "eng_Latn";
const LANGUAGE_KEY = "language";
const cacheKey = (code) => `translations:${code}`;
const BATCH = 40; // texts per request; NLLB on a CPU takes a few seconds per batch
const DELAY_MS = 60; // collect the texts of a whole screen before asking

// Shown until the backend's list arrives (and if it can't be reached).
export const DEFAULT_LANGUAGES = [
  { code: "eng_Latn", name: "English", nativeName: "English" },
  { code: "hin_Deva", name: "Hindi", nativeName: "हिन्दी" },
  { code: "tam_Taml", name: "Tamil", nativeName: "தமிழ்" },
  { code: "tel_Telu", name: "Telugu", nativeName: "తెలుగు" },
  { code: "kan_Knda", name: "Kannada", nativeName: "ಕನ್ನಡ" },
  { code: "mal_Mlym", name: "Malayalam", nativeName: "മലയാളം" },
];

export const LanguageContext = createContext({
  language: SOURCE_LANGUAGE,
  languages: DEFAULT_LANGUAGES,
  dictionary: {},
  offline: false,
  request: () => {},
  setLanguage: async () => {},
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(SOURCE_LANGUAGE);
  const [languages, setLanguages] = useState(DEFAULT_LANGUAGES);
  const [dictionary, setDictionary] = useState({});
  const [offline, setOffline] = useState(false);

  const languageRef = useRef(SOURCE_LANGUAGE);
  const requested = useRef(new Set()); // texts already asked for in the current language
  const pending = useRef(new Set()); // texts waiting for the next request
  const timer = useRef(null);
  const saveTimer = useRef(null);

  const save = (code, next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(cacheKey(code), JSON.stringify(next)).catch((err) => console.log("Save Translations Error:", err.message));
    }, 500);
  };

  const flush = useCallback(async () => {
    timer.current = null;
    const target = languageRef.current;
    const texts = [...pending.current];
    pending.current.clear();

    for (let start = 0; start < texts.length; start += BATCH) {
      const chunk = texts.slice(start, start + BATCH);
      try {
        const { data } = await api.post("/i18n/translate", { language: target, texts: chunk }, { timeout: 180000, quiet: true });
        if (data.success && languageRef.current === target) {
          setOffline(false);
          setDictionary((previous) => {
            const next = { ...previous, ...data.translations };
            save(target, next);
            return next;
          });
        }
      } catch (err) {
        // Show English for now and allow these texts to be asked for again later.
        chunk.forEach((text) => requested.current.delete(text));
        if (languageRef.current === target) setOffline(true);
        console.log("Translate Error:", err.response?.data?.message || err.message);
      }
    }
  }, []);

  // Called by <Text> (through useTranslated) for every English text it has no translation for.
  const request = useCallback(
    (text) => {
      if (requested.current.has(text)) return;
      requested.current.add(text);
      pending.current.add(text);
      if (!timer.current) timer.current = setTimeout(flush, DELAY_MS);
    },
    [flush]
  );

  const setLanguage = useCallback(async (code) => {
    const changed = languageRef.current !== code;
    if (changed) {
      // Texts queued for the old language are dropped; screens ask again for the new one.
      languageRef.current = code;
      requested.current = new Set();
      pending.current.clear();
      setOffline(false);
    }

    let cached = {};
    try {
      const raw = await AsyncStorage.getItem(cacheKey(code));
      cached = raw ? JSON.parse(raw) : {};
      await AsyncStorage.setItem(LANGUAGE_KEY, code);
    } catch (err) {
      console.log("Set Language Error:", err.message);
    }
    if (languageRef.current !== code) return; // the user picked another language meanwhile
    // Same language (e.g. restoring at start-up): keep what already arrived and add the saved copy.
    setDictionary((previous) => (changed ? cached : { ...cached, ...previous }));
    setLanguageState(code);
  }, []);

  // Restore the saved language.
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        await setLanguage(saved || SOURCE_LANGUAGE);
      } catch (err) {
        console.log("Restore Language Error:", err.message);
      }
    };
    restore();
  }, [setLanguage]);

  // The languages the backend offers.
  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const { data } = await api.get("/i18n/get-languages");
        if (data.success) setLanguages(data.languages);
      } catch (err) {
        console.log("Fetch Languages Error:", err.message);
      }
    };
    fetchLanguages();
  }, []);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(saveTimer.current);
    },
    []
  );

  const value = useMemo(
    () => ({ language, languages, dictionary, offline, request, setLanguage }),
    [language, languages, dictionary, offline, request, setLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// ── Translating a text ───────────────────────────────────────────────────────

const INDIAN_SCRIPT = /[ऀ-෿]/; // Devanagari … Malayalam
const HAS_LETTERS = /[A-Za-zऀ-෿]/;
const NOT_WORDS = /^(\S+@\S+\.\S+|https?:\/\/\S+|[A-Z]{2,5}\d*)$/; // emails, links, codes like "MBBS" or "IT"
const MAX_PIECE = 280;

// Splits long text into sentences (NLLB works sentence by sentence) and keeps the spacing and
// line breaks between them untranslated. Returns [{ text, translate }].
export function splitForTranslation(text) {
  const pieces = [];
  const addSentence = (sentence) => {
    const [, lead, core, trail] = sentence.match(/^(\s*)([\s\S]*?)(\s*)$/);
    if (lead) pieces.push({ text: lead, translate: false });
    if (core) pieces.push({ text: core, translate: HAS_LETTERS.test(core) && !NOT_WORDS.test(core) });
    if (trail) pieces.push({ text: trail, translate: false });
  };

  text.split(/(\n+)/).forEach((paragraph) => {
    if (!paragraph) return;
    if (paragraph.startsWith("\n")) {
      pieces.push({ text: paragraph, translate: false });
    } else if (paragraph.length <= MAX_PIECE) {
      addSentence(paragraph);
    } else {
      (paragraph.match(/[^.!?]+(?:[.!?]+|$)\s*/g) || [paragraph]).forEach(addSentence);
    }
  });
  return pieces;
}

// Returns `text` in the chosen language: the English text until its translation arrives.
// Pass null to skip translating.
export function useTranslated(text) {
  const { language, dictionary, request } = useContext(LanguageContext);
  // English needs no translating, except text typed in an Indian script.
  const active = typeof text === "string" && HAS_LETTERS.test(text) && (language !== SOURCE_LANGUAGE || INDIAN_SCRIPT.test(text));
  const pieces = useMemo(() => (active ? splitForTranslation(text) : null), [active, text]);

  const missing = pieces ? pieces.filter((piece) => piece.translate && dictionary[piece.text] === undefined).map((piece) => piece.text) : [];
  const missingKey = missing.join("\u0000");

  useEffect(() => {
    if (missingKey) missingKey.split("\u0000").forEach(request);
  }, [missingKey, language, request]);

  if (!pieces) return text;
  return pieces.map((piece) => (piece.translate ? dictionary[piece.text] ?? piece.text : piece.text)).join("");
}

export function useLanguage() {
  return useContext(LanguageContext);
}
