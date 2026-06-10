'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { UiLang } from '@/lib/i18n';

interface LangContextValue {
  lang: UiLang;
  setLang: (lang: UiLang) => void;
  dir: 'rtl' | 'ltr';
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<UiLang>('ar');

  useEffect(() => {
    const saved = localStorage.getItem('ui_lang') as UiLang | null;
    if (saved === 'ar' || saved === 'en') setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('ui_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, dir: lang === 'ar' ? 'rtl' : 'ltr' } as LangContextValue),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
