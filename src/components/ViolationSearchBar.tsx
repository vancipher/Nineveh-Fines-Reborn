'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useLang } from './LangProvider';
import { parseLocalizedNumber, sanitizeNumericInput } from '@/lib/numerals';
import { cn } from '@/lib/utils';

/** Sticky offset below AppShell header + safe area */
export const VIOLATION_SEARCH_STICKY_TOP =
  'top-[calc(3.25rem+env(safe-area-inset-top))]';

interface ViolationSearchBarProps {
  onJump: (indexNum: number) => void;
  className?: string;
  /** Flush inside entry table card (no outer negative margin) */
  embedded?: boolean;
  /** Highest violation index in the table (default 59; pass 60+ if catalog grows) */
  maxIndex?: number;
}

export function ViolationSearchBar({ onJump, className, embedded, maxIndex = 59 }: ViolationSearchBarProps) {
  const { lang } = useLang();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [lastIndex, setLastIndex] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  function jumpTo(n: number) {
    const clamped = Math.min(maxIndex, Math.max(1, n));
    setLastIndex(clamped);
    setQuery(String(clamped));
    setError('');
    onJump(clamped);
  }

  function tryJump(raw: string) {
    const n = parseLocalizedNumber(sanitizeNumericInput(raw));
    if (!Number.isFinite(n) || n < 1 || n > maxIndex) return false;
    jumpTo(n);
    return true;
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = sanitizeNumericInput(e.target.value);
    setQuery(val);
    setError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val) return;

    debounceRef.current = setTimeout(() => {
      const n = parseLocalizedNumber(val);
      if (!Number.isFinite(n) || n < 1 || n > maxIndex) {
        setError(
          lang === 'ar'
            ? `أدخل رقماً بين ١ و ${maxIndex}`
            : `Enter a number from 1 to ${maxIndex}`,
        );
      } else {
        jumpTo(n);
      }
    }, 350);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!tryJump(query)) {
        setError(
          lang === 'ar'
            ? `أدخل رقماً بين ١ و ${maxIndex}`
            : `Enter a number from 1 to ${maxIndex}`,
        );
      }
    }
    if (e.key === 'Escape') {
      setQuery('');
      setError('');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      jumpTo(lastIndex + 1);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      jumpTo(lastIndex - 1);
    }
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      ref={barRef}
      className={cn(
        'sticky z-40 border-b border-slate-200 bg-white/98 py-2.5 shadow-md backdrop-blur-md',
        VIOLATION_SEARCH_STICKY_TOP,
        embedded ? 'px-3' : '-mx-3 px-3',
        !embedded && 'md:mx-0',
        'dark:border-dark-border dark:bg-dark-surface/98',
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-2">
        <label className="hidden shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:inline">
          {lang === 'ar' ? 'بحث برقم المخالفة' : 'Violation #'}
        </label>

        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            className="btn-secondary flex h-11 w-11 shrink-0 items-center justify-center p-0"
            onClick={() => jumpTo(lastIndex - 1)}
            disabled={lastIndex <= 1}
            aria-label={lang === 'ar' ? 'المخالفة السابقة' : 'Previous violation'}
          >
            <ChevronUp size={18} aria-hidden />
          </button>

          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute start-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              aria-hidden
            />
            <input
              className="input h-11 w-full ps-8 text-center text-base font-bold"
              type="text"
              inputMode="numeric"
              placeholder={lang === 'ar' ? `١–${maxIndex}` : `1–${maxIndex}`}
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              aria-label={lang === 'ar' ? 'رقم المخالفة' : 'Violation number'}
            />
          </div>

          <button
            type="button"
            className="btn-secondary flex h-11 w-11 shrink-0 items-center justify-center p-0"
            onClick={() => jumpTo(lastIndex + 1)}
            disabled={lastIndex >= maxIndex}
            aria-label={lang === 'ar' ? 'المخالفة التالية' : 'Next violation'}
          >
            <ChevronDown size={18} aria-hidden />
          </button>
        </div>

        <span className="hidden shrink-0 tabular-nums text-xs text-slate-500 dark:text-slate-400 md:inline">
          {lang === 'ar' ? `الحالي: ${lastIndex}` : `#${lastIndex}`}
        </span>
      </div>

      {error && (
        <p role="alert" className="mx-auto mt-1 max-w-6xl text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
