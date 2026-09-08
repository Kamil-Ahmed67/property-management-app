import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../i18n/translations';

const STORAGE_KEY = 'prophub.language';
const DEFAULT_LANGUAGE = 'bn'; // Bengali is the default on first launch

export const LanguageContext = createContext({
  lang: DEFAULT_LANGUAGE,
  t: (key) => key,
  toggleLanguage: () => {},
  setLanguage: () => {},
  resetLanguage: () => {},
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(DEFAULT_LANGUAGE);

  // Restore the saved choice on launch; falls back to Bengali if nothing
  // was saved or storage fails.
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'bn' || saved === 'en') {
          setLang(saved);
        }
      } catch {
        // Keep the default — a storage failure shouldn't block the app.
      }
    })();
  }, []);

  const setLanguage = useCallback(async (next) => {
    setLang(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Non-fatal: the language still changes for this session.
    }
  }, []);

  // Clears the saved choice and falls back to the app default — used on
  // logout so the next session (possibly a different person) starts fresh
  // rather than inheriting whatever the previous user picked.
  const resetLanguage = useCallback(async () => {
    setLang(DEFAULT_LANGUAGE);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal — the in-memory language still resets for this session.
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(lang === 'bn' ? 'en' : 'bn');
  }, [lang, setLanguage]);

  // t('some.key') -> string for the active language. Falls back to the
  // other language, then to the key itself, so a missing translation shows
  // something readable instead of blank.
  const t = useCallback(
    (key, params) => {
      const active = translations[lang]?.[key];
      const fallbackLang = lang === 'bn' ? 'en' : 'bn';
      const fallback = translations[fallbackLang]?.[key];
      const raw = active !== undefined ? active : fallback !== undefined ? fallback : key;

      if (!params) return raw;

      // Simple {placeholder} substitution — e.g. t('x', { name: 'Foo' })
      // replaces every {name} in the string with 'Foo'.
      return Object.keys(params).reduce(
        (result, paramKey) => result.replaceAll(`{${paramKey}}`, params[paramKey]),
        raw
      );
    },
    [lang]
  );

  const value = useMemo(
    () => ({ lang, t, toggleLanguage, setLanguage, resetLanguage }),
    [lang, t, toggleLanguage, setLanguage, resetLanguage]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}