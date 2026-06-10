'use client';

import { useEffect, useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import { useLang } from './LangProvider';
import { Spinner } from './ui';
import { todayIso } from '@/lib/utils';
import { canWriteEntries } from '@/lib/auth/roles';

export function ExcelImportPanel() {
  const { lang } = useLang();
  const [canImport, setCanImport] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [entryDate, setEntryDate] = useState(todayIso());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setCanImport(canWriteEntries(d.user?.role)))
      .catch(() => setCanImport(false));
  }, []);

  if (!canImport) return null;

  async function onFileSelected(file: File | null) {
    if (!file) return;
    setLoading(true);
    setMessage('');
    setError('');

    const fd = new FormData();
    fd.append('file', file);
    fd.append('entryDate', entryDate);

    try {
      const res = await fetch('/api/import/excel', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(String(data.error ?? (lang === 'ar' ? 'فشل الاستيراد' : 'Import failed')));
        return;
      }
      const sectors = (data.sectors as string[] | undefined)?.join(lang === 'ar' ? '، ' : ', ') ?? '';
      setMessage(
        lang === 'ar'
          ? `تم استيراد ${data.created} جلسة للتاريخ ${entryDate}${sectors ? ` (${sectors})` : ''}`
          : `Imported ${data.created} session(s) for ${entryDate}${sectors ? ` (${sectors})` : ''}`,
      );
    } catch {
      setError(lang === 'ar' ? 'خطأ في الشبكة' : 'Network error');
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-dark-elevated dark:text-emerald-400">
          <FileSpreadsheet size={20} aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {lang === 'ar' ? 'استيراد من Excel' : 'Import from Excel'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {lang === 'ar'
              ? 'ارفع ملف Excel (ورقة 59مخالفة) لإضافة البيانات إلى النظام دون إعادة الإدخال يدوياً.'
              : 'Upload an Excel file (59مخالفة sheet) to load data into the system without re-entering manually.'}
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-600 dark:text-slate-400">
          {lang === 'ar' ? 'تاريخ الإدخال' : 'Entry date'}
        </label>
        <input className="input max-w-xs" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
      />

      <button
        type="button"
        className="btn-primary gap-2"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? <Spinner size="sm" /> : <Upload size={16} aria-hidden />}
        {loading
          ? lang === 'ar'
            ? 'جاري الاستيراد...'
            : 'Importing...'
          : lang === 'ar'
            ? 'اختيار ملف Excel'
            : 'Choose Excel file'}
      </button>

      {message && <p className="text-sm text-green-700 dark:text-green-400">{message}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
