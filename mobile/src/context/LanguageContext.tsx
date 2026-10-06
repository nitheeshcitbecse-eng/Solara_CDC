import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { i18n } from '../lib/i18n';
import { getLanguage, type LanguageCode, type Script } from '../lib/i18n/languages';
import { getSavedLanguage, saveLanguage } from '../lib/storage/preferences';

type LanguageState = {
  /** The confirmed choice, or null before the user has picked one (first launch). */
  savedLanguage: LanguageCode | null;
  /** What the UI renders right now — differs from savedLanguage while previewing. */
  activeLanguage: LanguageCode;
  script: Script;
  hydrated: boolean;
};

type LanguageActions = {
  /** Switch the UI live without saving (Language screen preview). */
  previewLanguage: (code: LanguageCode) => void;
  /** Save the choice and keep the UI in that language. */
  confirmLanguage: (code: LanguageCode) => Promise<void>;
  /** Abandon a preview and go back to the saved language. */
  cancelPreview: () => void;
};

const LanguageStateContext = createContext<LanguageState | null>(null);
const LanguageActionsContext = createContext<LanguageActions | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [savedLanguage, setSavedLanguage] = useState<LanguageCode | null>(null);
  const [activeLanguage, setActiveLanguage] = useState<LanguageCode>('en');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getSavedLanguage().then((stored) => {
      if (cancelled) return;
      if (stored) {
        setSavedLanguage(stored);
        setActiveLanguage(stored);
        void i18n.changeLanguage(stored);
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const previewLanguage = useCallback((code: LanguageCode) => {
    setActiveLanguage(code);
    void i18n.changeLanguage(code);
  }, []);

  const confirmLanguage = useCallback(async (code: LanguageCode) => {
    setActiveLanguage(code);
    await i18n.changeLanguage(code);
    await saveLanguage(code);
    setSavedLanguage(code);
  }, []);

  const cancelPreview = useCallback(() => {
    if (!savedLanguage) return;
    setActiveLanguage(savedLanguage);
    void i18n.changeLanguage(savedLanguage);
  }, [savedLanguage]);

  const state = useMemo<LanguageState>(
    () => ({ savedLanguage, activeLanguage, script: getLanguage(activeLanguage).script, hydrated }),
    [savedLanguage, activeLanguage, hydrated],
  );
  const actions = useMemo<LanguageActions>(
    () => ({ previewLanguage, confirmLanguage, cancelPreview }),
    [previewLanguage, confirmLanguage, cancelPreview],
  );

  return (
    <LanguageActionsContext.Provider value={actions}>
      <LanguageStateContext.Provider value={state}>{children}</LanguageStateContext.Provider>
    </LanguageActionsContext.Provider>
  );
}

export function useLanguage(): LanguageState {
  const value = useContext(LanguageStateContext);
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider');
  return value;
}

export function useLanguageActions(): LanguageActions {
  const value = useContext(LanguageActionsContext);
  if (!value) throw new Error('useLanguageActions must be used inside LanguageProvider');
  return value;
}
