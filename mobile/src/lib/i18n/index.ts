import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { isLanguageCode, type LanguageCode } from './languages';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { ta } from './locales/ta';

const resources = {
  en: { translation: en },
  ta: { translation: ta },
  hi: { translation: hi },
} as const;

// Languages without a resource bundle (te, kn, ml, …) resolve every key through
// `fallbackLng`, so the UI shows English until translations are added.
const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: false,
  interpolation: { escapeValue: false }, // React already escapes rendered text.
  returnNull: false,
  initAsync: false, // Resources are bundled, so initialise synchronously before the first render.
});

/** The phone's preferred language if Solara supports it — used to pre-select on first launch. */
export function detectDeviceLanguage(): LanguageCode {
  const locale = getLocales()[0];
  const code = locale?.languageCode ?? 'en';
  return isLanguageCode(code) ? code : 'en';
}

export { i18n };
