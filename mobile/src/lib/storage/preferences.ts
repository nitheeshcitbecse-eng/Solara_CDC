import AsyncStorage from '@react-native-async-storage/async-storage';

import { isLanguageCode, type LanguageCode } from '../i18n/languages';

/**
 * Non-secret, non-personal preferences only. AsyncStorage is plain text on disk,
 * so tokens, names, phone numbers or documents must never be written here.
 */
const KEYS = {
  language: 'solara.pref.language',
} as const;

export async function getSavedLanguage(): Promise<LanguageCode | null> {
  try {
    const value = await AsyncStorage.getItem(KEYS.language);
    return isLanguageCode(value) ? value : null;
  } catch {
    return null;
  }
}

export async function saveLanguage(language: LanguageCode): Promise<void> {
  await AsyncStorage.setItem(KEYS.language, language);
}
