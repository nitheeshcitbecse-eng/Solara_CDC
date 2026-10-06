export type Script = 'latin' | 'tamil' | 'devanagari';

export const LANGUAGE_CODES = ['en', 'ta', 'hi', 'te', 'kn', 'ml', 'bn', 'mr', 'gu', 'pa', 'or', 'ur'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

export type LanguageInfo = {
  code: LanguageCode;
  /** Name written in the language itself — always shown untranslated so people can find their own. */
  nativeName: string;
  englishName: string;
  /** Script used to pick fonts. Languages without translations render English, so they use Latin. */
  script: Script;
  hasTranslations: boolean;
};

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: 'en', nativeName: 'English', englishName: 'English', script: 'latin', hasTranslations: true },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', script: 'tamil', hasTranslations: true },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', script: 'devanagari', hasTranslations: true },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', script: 'latin', hasTranslations: false },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', script: 'latin', hasTranslations: false },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', script: 'latin', hasTranslations: false },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bengali', script: 'latin', hasTranslations: false },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', script: 'devanagari', hasTranslations: false },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', script: 'latin', hasTranslations: false },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', script: 'latin', hasTranslations: false },
  { code: 'or', nativeName: 'ଓଡ଼ିଆ', englishName: 'Odia', script: 'latin', hasTranslations: false },
  // Urdu is right-to-left. It falls back to English for now, so RTL is intentionally not forced;
  // layouts use start/end so enabling RTL later is a config change, not a rewrite.
  { code: 'ur', nativeName: 'اردو', englishName: 'Urdu', script: 'latin', hasTranslations: false },
];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && (LANGUAGE_CODES as readonly string[]).includes(value);
}

export function getLanguage(code: LanguageCode): LanguageInfo {
  const info = LANGUAGES.find((language) => language.code === code);
  // LANGUAGES covers every LanguageCode, so this only guards against future edits.
  if (!info) throw new Error(`Unknown language: ${code}`);
  return info;
}
