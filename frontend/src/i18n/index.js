import React, { createContext, useContext, useState, useCallback } from 'react';
import tr from './tr.json';
import en from './en.json';

const translations = { tr, en };
const STORAGE_KEY = 'powersense_lang';

function getInitialLang() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && translations[stored]) return stored;
  } catch {}
  return 'tr';
}

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  const setLang = useCallback((newLang) => {
    if (translations[newLang]) {
      setLangState(newLang);
      try { localStorage.setItem(STORAGE_KEY, newLang); } catch {}
    }
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, translations: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');

  const { lang, setLang, translations: t } = ctx;

  const tt = useCallback((path, params) => {
    const keys = path.split('.');
    let val = t;
    for (const k of keys) {
      if (val && typeof val === 'object' && k in val) val = val[k];
      else return path;
    }
    if (typeof val !== 'string') return path;
    if (params) {
      return val.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
    }
    return val;
  }, [t]);

  return { t: tt, lang, setLang };
}

export const LANGUAGES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];
