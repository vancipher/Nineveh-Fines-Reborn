'use client';

import { useRef, useState, useCallback, type RefObject } from 'react';
import { X, Download, Image as ImageIcon, CheckSquare, Square } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { captureElementAsPng } from '@/lib/export/pngCapture';
import { SummaryPreviewTable, type SummaryPreviewData } from './SummaryPreviewTable';
import { ReportPreviewTable, type ReportPreviewData } from './ReportPreviewTable';
import { MainPreviewTable, type MainPreviewData } from './MainPreviewTable';
import { Spinner } from './ui';
import { useLang } from './LangProvider';
import { EXCEL_SHEET_NAMES, type ExcelSheetKey } from '@/lib/excel/sheetNames';
import { logClientAudit } from '@/lib/auditClient';
import { AuditEvents } from '@/lib/auth/auditEvents';
import { exportPngSummary } from '@/lib/auth/auditMessages';

interface SheetConfig {
  key: ExcelSheetKey;
  labelAr: string;
  labelEn: string;
}

const SHEETS: SheetConfig[] = [
  { key: 'main', labelAr: EXCEL_SHEET_NAMES.main, labelEn: '59 Violations grid' },
  { key: 'report', labelAr: EXCEL_SHEET_NAMES.report, labelEn: 'Violations & Amounts' },
  { key: 'summary', labelAr: EXCEL_SHEET_NAMES.summary, labelEn: 'Summary' },
];

export interface SheetsPayload {
  summary: SummaryPreviewData;
  report: ReportPreviewData;
  main: MainPreviewData;
}

interface Props {
  open: boolean;
  onClose: () => void;
  payload: SheetsPayload | null;
  filenameBase: string;
}

const RENDERABLE_KEYS: ExcelSheetKey[] = ['main', 'report', 'summary'];

export function PngSheetModal({ open, onClose, payload, filenameBase }: Props) {
  const { lang } = useLang();
  const [selected, setSelected] = useState<Set<ExcelSheetKey>>(
    new Set(['main', 'report', 'summary']),
  );
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const summaryRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  function toggle(key: ExcelSheetKey) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === RENDERABLE_KEYS.length ? new Set() : new Set(RENDERABLE_KEYS),
    );
  }

  const handleExport = useCallback(async () => {
    if (!payload) return;
    setExporting(true);
    setError('');
    const errors: string[] = [];

    const refMap: Record<ExcelSheetKey, RefObject<HTMLDivElement | null>> = {
      summary: summaryRef,
      report: reportRef,
      main: mainRef,
    };

    for (const sheet of SHEETS) {
      if (!selected.has(sheet.key)) continue;
      const el = refMap[sheet.key].current;
      if (!el) continue;
      try {
        const width = sheet.key === 'main' ? Math.max(900, el.scrollWidth) : undefined;
        await captureElementAsPng(el, {
          filename: `${filenameBase}_${sheet.key}`,
          pixelRatio: 3,
          backgroundColor: '#ffffff',
          width,
        });
      } catch {
        errors.push(sheet.key);
      }
    }

    setExporting(false);
    if (errors.length) {
      setError(
        lang === 'ar'
          ? `فشل تصدير: ${errors.join(', ')}`
          : `Export failed for: ${errors.join(', ')}`,
      );
    } else {
      const exported = SHEETS.filter((s) => selected.has(s.key) && !errors.includes(s.key)).map(
        (s) => (lang === 'ar' ? s.labelAr : s.labelEn),
      );
      if (exported.length > 0) {
        logClientAudit(
          AuditEvents.EXPORT_PNG,
          exportPngSummary(exported, `${filenameBase}`),
          { sheets: exported, filenameBase },
        );
      }
      onClose();
    }
  }, [payload, selected, filenameBase, lang, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative z-10 w-full max-w-xl rounded-t-2xl bg-white p-4 shadow-2xl dark:bg-dark-surface sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} aria-hidden className="text-brand-600 dark:text-brand-400" />
                <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {lang === 'ar' ? 'تصدير ورقات Excel كصور PNG' : 'Export Excel sheets as PNG'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-dark-hover"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                  {lang === 'ar' ? 'اختر الورقات للتصدير' : 'Select sheets to export'}
                </p>
                <button
                  type="button"
                  className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                  onClick={toggleAll}
                >
                  {selected.size === SHEETS.length
                    ? lang === 'ar'
                      ? 'إلغاء الكل'
                      : 'Deselect all'
                    : lang === 'ar'
                      ? 'تحديد الكل'
                      : 'Select all'}
                </button>
              </div>

              {SHEETS.map((sheet) => {
                const checked = selected.has(sheet.key);
                return (
                  <button
                    key={sheet.key}
                    type="button"
                    onClick={() => toggle(sheet.key)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:bg-slate-50 dark:border-dark-border dark:hover:bg-dark-hover"
                  >
                    {checked ? (
                      <CheckSquare
                        size={18}
                        className="shrink-0 text-brand-600 dark:text-brand-400"
                      />
                    ) : (
                      <Square size={18} className="shrink-0 text-slate-400" />
                    )}
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200" dir="rtl">
                      {lang === 'ar' ? sheet.labelAr : sheet.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>

            {payload && (
              <div aria-hidden="true" className="pointer-events-none fixed -left-[9999px] -top-[9999px]">
                <div style={{ width: 720, fontFamily: 'Arial, sans-serif' }}>
                  <SummaryPreviewTable ref={summaryRef} data={payload.summary} />
                </div>
                <div style={{ width: 720, fontFamily: 'Arial, sans-serif' }}>
                  <ReportPreviewTable ref={reportRef} data={payload.report} />
                </div>
                <div style={{ minWidth: 960, fontFamily: 'Arial, sans-serif' }}>
                  <MainPreviewTable ref={mainRef} data={payload.main} />
                </div>
              </div>
            )}

            {error && (
              <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-950/30 dark:text-red-400">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary flex-1 text-sm"
                onClick={onClose}
                disabled={exporting}
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                className="btn-primary flex-1 gap-2 text-sm"
                disabled={exporting || selected.size === 0 || !payload}
                onClick={handleExport}
              >
                {exporting ? <Spinner size="sm" /> : <Download size={15} />}
                {exporting
                  ? lang === 'ar'
                    ? 'جاري التصدير...'
                    : 'Exporting...'
                  : lang === 'ar'
                    ? `تصدير (${selected.size})`
                    : `Export (${selected.size})`}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
