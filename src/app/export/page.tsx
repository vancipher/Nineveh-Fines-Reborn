'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';
import { PageTitle, LoadingState, Spinner } from '@/components/ui';
import { SummaryPreviewTable, type SummaryPreviewData } from '@/components/SummaryPreviewTable';
import { PngSheetModal, type SheetsPayload } from '@/components/PngSheetModal';
import { useLang } from '@/components/LangProvider';
import { t } from '@/lib/i18n';
import { dateRangePresets } from '@/lib/dates';
import { todayIso, cn } from '@/lib/utils';
import type { ReportPreviewData } from '@/components/ReportPreviewTable';
import type { MainPreviewData } from '@/components/MainPreviewTable';

interface Sector {
  id: string;
  nameAr: string;
  nameEn: string;
}

type Preset = 'daily' | 'weekly' | 'monthly' | 'custom';

interface FullPreviewData extends SummaryPreviewData {
  grandAmount: number;
  totalVehicles: number;
  totalBikes: number;
  fromDate: string;
  toDate: string;
  reportRows: { index: number; nameAr: string; count: number; amount: number }[];
  mainSheet?: MainPreviewData;
}

export default function ExportPage() {
  const { lang } = useLang();
  const presets = dateRangePresets();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [preset, setPreset] = useState<Preset>('daily');
  const [fromDate, setFromDate] = useState(presets.daily.from);
  const [toDate, setToDate] = useState(presets.daily.to);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [previewData, setPreviewData] = useState<FullPreviewData | null>(null);
  const [pngModalOpen, setPngModalOpen] = useState(false);
  const [error, setError] = useState('');

  const exportPayload = useMemo(
    () => ({ fromDate, toDate, sectorIds: selected }),
    [fromDate, toDate, selected],
  );

  useEffect(() => {
    fetch('/api/export')
      .then((r) => r.json())
      .then((data) => {
        setSectors(data.sectors ?? []);
        setSelected((data.sectors ?? []).map((s: Sector) => s.id));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected.length === 0) {
      setPreviewData(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch('/api/export/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportPayload),
      })
        .then((r) => r.json())
        .then((data: FullPreviewData) => {
          if ((data as { error?: string }).error) return;
          setPreviewData(data);
        })
        .catch(() => setPreviewData(null));
    }, 400);
    return () => clearTimeout(timer);
  }, [exportPayload, selected.length]);

  function applyPreset(next: Preset) {
    setPreset(next);
    if (next === 'daily') {
      setFromDate(presets.daily.from);
      setToDate(presets.daily.to);
    } else if (next === 'weekly') {
      setFromDate(presets.weekly.from);
      setToDate(presets.weekly.to);
    } else if (next === 'monthly') {
      setFromDate(presets.monthly.from);
      setToDate(presets.monthly.to);
    } else {
      setFromDate(todayIso());
      setToDate(todayIso());
    }
  }

  function toggleSector(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected(selected.length === sectors.length ? [] : sectors.map((s) => s.id));
  }

  async function downloadExcel() {
    setDownloading(true);
    setError('');
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportPayload),
    });
    setDownloading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t(lang, 'error'));
      return;
    }
    const blob = await res.blob();
    triggerDownload(blob, `nineveh-fines_${fromDate}_${toDate}.xlsx`);
  }

  async function downloadWord() {
    setDownloadingWord(true);
    setError('');
    const res = await fetch('/api/export/word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportPayload),
    });
    setDownloadingWord(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? t(lang, 'error'));
      return;
    }
    const blob = await res.blob();
    triggerDownload(blob, `nineveh-summary_${fromDate}_${toDate}.docx`);
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Build SheetsPayload for modal
  const sheetsPayload: SheetsPayload | null =
    previewData && previewData.mainSheet
      ? {
          summary: {
            introText: previewData.introText,
            footerText: previewData.footerText,
            sectors: previewData.sectors,
            grandCount: previewData.grandCount,
            grandVehicles: previewData.grandVehicles,
            grandBikes: previewData.grandBikes,
          },
          report: {
            introText: previewData.introText,
            fromDate: previewData.fromDate,
            toDate: previewData.toDate,
            totalVehicles: previewData.totalVehicles,
            totalBikes: previewData.totalBikes,
            grandCount: previewData.grandCount,
            grandAmount: previewData.grandAmount,
            rows: previewData.reportRows ?? [],
          } satisfies ReportPreviewData,
          main: previewData.mainSheet,
        }
      : null;

  if (loading) return <LoadingState />;

  const allSelected = selected.length === sectors.length;
  const noneSelected = selected.length === 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="space-y-6"
      >
        <PageTitle
          title={t(lang, 'exportTitle')}
          subtitle={
            lang === 'ar'
              ? 'صدّر Excel أو ملخص Word أو صور PNG للجداول'
              : 'Export Excel, Word summary, or PNG images of sheets'
          }
        />

        {/* Period */}
        <div className="card space-y-4">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {lang === 'ar' ? 'الفترة الزمنية' : 'Period'}
          </p>
          <div className="flex flex-wrap gap-2">
            {(['daily', 'weekly', 'monthly', 'custom'] as Preset[]).map((p) => (
              <motion.button
                key={p}
                whileTap={{ scale: 0.95 }}
                type="button"
                className={preset === p ? 'btn-primary' : 'btn-secondary'}
                onClick={() => applyPreset(p)}
              >
                {t(lang, p)}
              </motion.button>
            ))}
          </div>
          <AnimatePresence>
            {preset === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="grid gap-3 overflow-hidden sm:grid-cols-2"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t(lang, 'from')}
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t(lang, 'to')}
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {preset !== 'custom' && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar' ? `من ${fromDate} إلى ${toDate}` : `${fromDate} → ${toDate}`}
            </p>
          )}
        </div>

        {/* Sector selector */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'selectSectors')}
            </p>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={toggleAll}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-400 dark:border-dark-border dark:text-dark-muted"
              >
                {allSelected
                  ? lang === 'ar'
                    ? 'إلغاء الكل'
                    : 'Deselect all'
                  : lang === 'ar'
                    ? 'تحديد الكل'
                    : 'Select all'}
              </motion.button>
              <span className="flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold dark:bg-dark-elevated">
                {selected.length}/{sectors.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sectors.map((s, i) => {
              const isSelected = selected.includes(s.id);
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSector(s.id)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileTap={{ scale: 0.96 }}
                  className={cn('sector-card items-start text-start', isSelected && 'selected')}
                >
                  <span
                    className={cn(
                      'text-xs font-medium leading-tight',
                      isSelected
                        ? 'text-brand-700 dark:text-slate-100'
                        : 'text-slate-700 dark:text-slate-300',
                    )}
                  >
                    {lang === 'ar' ? s.nameAr : s.nameEn}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            className="btn-primary gap-2 px-6"
            onClick={downloadExcel}
            disabled={downloading || noneSelected}
          >
            {downloading ? <Spinner size="sm" /> : <FileSpreadsheet size={16} />}
            {downloading
              ? lang === 'ar'
                ? 'جاري التصدير...'
                : 'Exporting...'
              : t(lang, 'download')}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            className="btn-secondary gap-2 px-5"
            onClick={downloadWord}
            disabled={downloadingWord || noneSelected}
          >
            {downloadingWord ? <Spinner size="sm" /> : <FileText size={16} />}
            {lang === 'ar' ? 'تصدير Word (ملخص)' : 'Export Word (summary)'}
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            className="btn-secondary gap-2 px-5"
            onClick={() => setPngModalOpen(true)}
            disabled={noneSelected || !previewData}
          >
            <ImageIcon size={16} aria-hidden />
            {lang === 'ar' ? 'تصدير PNG للجداول' : 'Export sheets as PNG'}
          </motion.button>

          {noneSelected && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {lang === 'ar' ? 'اختر قاطعاً على الأقل' : 'Select at least one sector'}
            </p>
          )}
        </div>

        {/* Inline summary preview */}
        {previewData && (
          <div className="card space-y-3">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {lang === 'ar' ? 'معاينة ملخص التصدير' : 'Summary preview'}
            </p>
            <SummaryPreviewTable data={previewData} />
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* PNG sheet selector modal */}
      <PngSheetModal
        open={pngModalOpen}
        onClose={() => setPngModalOpen(false)}
        payload={sheetsPayload}
        filenameBase={`nineveh_${fromDate}_${toDate}`}
      />
    </>
  );
}
