'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useLang } from './LangProvider';
import { NumericInput } from './NumericInput';
import { t, formatIqd } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { MAX_FINE_AMOUNT, MAX_VIOLATION_COUNT } from '@/lib/limits';

export interface EntryRow {
  violationId: string;
  indexNum: number;
  nameAr: string;
  nameEn: string;
  count: number;
  amount: number;
}

export interface EntryTableHandle {
  scrollToIndex: (indexNum: number) => void;
}

interface EntryTableProps {
  rows: EntryRow[];
  highlightIndex?: number | null;
  onChange: (indexNum: number, field: 'count' | 'amount', value: number) => void;
  readOnly?: boolean;
  /** Parent provides outer card (e.g. with sticky search above). */
  embedded?: boolean;
}

export const EntryTable = forwardRef<EntryTableHandle, EntryTableProps>(function EntryTable(
  { rows, highlightIndex, onChange, readOnly, embedded },
  ref,
) {
  const { lang } = useLang();
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());
  const scrollRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    scrollToIndex(indexNum: number) {
      const el = rowRefs.current.get(indexNum);
      const container = scrollRef.current;
      if (!el || !container) return;

      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offsetInContainer = elRect.top - containerRect.top + container.scrollTop;
      const targetTop = offsetInContainer - container.clientHeight / 2 + elRect.height / 2;
      const maxScroll = container.scrollHeight - container.clientHeight;
      container.scrollTo({
        top: Math.min(maxScroll, Math.max(0, targetTop)),
        behavior: 'smooth',
      });

      el.classList.add('highlight-row');
      setTimeout(() => el.classList.remove('highlight-row'), 2500);
    },
  }));

  const tableBody = (
    <div
      ref={scrollRef}
      className="table-scroll max-h-[min(65vh,720px)] overflow-y-auto overscroll-contain pb-24 sm:max-h-[min(70vh,720px)]"
    >
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-[1] bg-slate-100 text-slate-700 dark:bg-dark-elevated dark:text-dark-text">
            <tr>
              <th className="px-3 py-2 text-start">{t(lang, 'index')}</th>
              <th className="px-3 py-2 text-start">{t(lang, 'violation')}</th>
              <th className="px-3 py-2 text-start">{t(lang, 'count')}</th>
              <th className="px-3 py-2 text-start">{t(lang, 'amount')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.violationId}
                ref={(el) => {
                  if (el) rowRefs.current.set(row.indexNum, el);
                  else rowRefs.current.delete(row.indexNum);
                }}
                className={cn('border-t border-slate-100 dark:border-dark-border', highlightIndex === row.indexNum && 'highlight-row')}
              >
                <td className="px-3 py-2 font-medium">{row.indexNum}</td>
                <td className="px-3 py-2">{lang === 'ar' ? row.nameAr : row.nameEn}</td>
                <td className="px-2 py-2 sm:px-3">
                  <NumericInput
                    className="max-w-[88px] sm:max-w-[90px]"
                    inputClassName="text-center font-semibold"
                    min={0}
                    max={MAX_VIOLATION_COUNT}
                    readOnly={readOnly}
                    value={row.count}
                    onChange={(v) => onChange(row.indexNum, 'count', v)}
                  />
                </td>
                <td className="px-2 py-2 sm:px-3">
                  <NumericInput
                    className="max-w-full sm:max-w-[140px]"
                    inputClassName="text-center font-semibold"
                    min={0}
                    max={MAX_FINE_AMOUNT}
                    readOnly={readOnly}
                    value={row.amount}
                    onChange={(v) => onChange(row.indexNum, 'amount', v)}
                  />
                  {row.amount > 0 && (
                    <p className="mt-1 text-xs text-slate-500">{formatIqd(row.amount, lang)}</p>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );

  if (embedded) return tableBody;

  return <div className="card overflow-hidden p-0">{tableBody}</div>;
});
