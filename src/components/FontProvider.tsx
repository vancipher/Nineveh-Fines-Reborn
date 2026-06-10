'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type UiFont = 'tajawal' | 'almarai';

const STORAGE_KEY = 'ui_font';
const DEFAULT_FONT: UiFont = 'almarai';

/** Apply font to DOM immediately (before React re-render). */
export function applyUiFont(font: UiFont) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;
  root.dataset.font = font;
  root.classList.remove('font-tajawal', 'font-almarai');
  body.classList.remove('font-tajawal', 'font-almarai');
  const cls = font === 'tajawal' ? 'font-tajawal' : 'font-almarai';
  root.classList.add(cls);
  body.classList.add(cls);
  try {
    localStorage.setItem(STORAGE_KEY, font);
  } catch {
    /* private browsing */
  }
}

function readStoredFont(): UiFont {
  if (typeof window === 'undefined') return DEFAULT_FONT;
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as UiFont | null;
    if (saved === 'tajawal' || saved === 'almarai') return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_FONT;
}

interface FontContextValue {
  font: UiFont;
  setFont: (f: UiFont) => void;
}

const FontContext = createContext<FontContextValue | null>(null);

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<UiFont>(DEFAULT_FONT);

  const setFont = useCallback((f: UiFont) => {
    applyUiFont(f);
    setFontState(f);
  }, []);

  useEffect(() => {
    const stored = readStoredFont();
    setFontState(stored);
    applyUiFont(stored);
  }, []);

  const value = useMemo(() => ({ font, setFont }), [font, setFont]);

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useFont() {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error('useFont must be used within FontProvider');
  return ctx;
}
