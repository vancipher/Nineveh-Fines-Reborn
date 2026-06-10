'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useLang } from './LangProvider';
import { Spinner } from './ui';

interface SessionRow {
  id: string;
  sectorId: string;
  entryDate: string;
  nameAr: string;
  nameEn: string;
  totalCount: number;
  totalAmount: number;
  createdAt: string;
}

interface Props {
  sectorId?: string;
  entryDate?: string;
  onDeleted?: () => void;
}

export function EntrySessionsPanel({ sectorId, entryDate, onDeleted }: Props) {
  const { lang } = useLang();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/entries?list=1')
      .then((r) => r.json())
      .then((d) => {
        let rows: SessionRow[] = d.entries ?? [];
        if (sectorId) rows = rows.filter((e) => e.sectorId === sectorId);
        if (entryDate) rows = rows.filter((e) => e.entryDate === entryDate);
        setSessions(rows.slice(0, 20));
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [sectorId, entryDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function deleteSession(session: SessionRow) {
    const sectorLabel = lang === 'ar' ? session.nameAr : session.nameEn;
    const firstOk = window.confirm(
      lang === 'ar'
        ? `حذف جلسة «${sectorLabel}» بتاريخ ${session.entryDate}؟\n(لن تُحذف جلسات أخرى لنفس القاطع)`
        : `Delete the session for «${sectorLabel}» on ${session.entryDate}?\n(Other sessions for this sector will stay)`,
    );
    if (!firstOk) return;

    const secondOk = window.confirm(
      lang === 'ar'
        ? `تأكيد نهائي: حذف هذه الجلسة نهائياً ولا يمكن التراجع.\n${sectorLabel} — ${session.entryDate}`
        : `Final confirmation: permanently delete this session. This cannot be undone.\n${sectorLabel} — ${session.entryDate}`,
    );
    if (!secondOk) return;

    const id = session.id;
    setDeletingId(id);
    const res = await fetch(`/api/entries?id=${id}`, { method: 'DELETE' });
    setDeletingId(null);
    if (res.ok) {
      load();
      onDeleted?.();
    }
  }

  if (loading) {
    return (
      <div className="card flex items-center gap-2 text-sm text-slate-500">
        <Spinner size="sm" />
        {lang === 'ar' ? 'جاري تحميل الجلسات...' : 'Loading sessions...'}
      </div>
    );
  }

  if (sessions.length === 0) return null;

  return (
    <div className="card space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {lang === 'ar' ? 'جلسات الإدخال المحفوظة' : 'Saved entry sessions'}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {lang === 'ar'
            ? 'كل حفظ جلسة منفصلة — يمكنك حذف أو تعديل أي جلسة دون التأثير على الباقي. التصدير يجمع كل الجلسات في الملف الرئيسي.'
            : 'Each save is a separate session. Delete or edit one without affecting others. Export aggregates all sessions.'}
        </p>
      </div>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-dark-border"
          >
            <div className="min-w-0 text-sm">
              <p className="font-medium text-slate-800 dark:text-slate-100">
                {lang === 'ar' ? s.nameAr : s.nameEn}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {s.entryDate} · {s.totalCount} / {s.totalAmount.toLocaleString()} IQD
              </p>
              <p className="text-[10px] text-slate-400">
                {new Date(s.createdAt).toLocaleString(lang === 'ar' ? 'ar-IQ' : 'en-IQ')}
              </p>
            </div>
            <button
              type="button"
              className="btn-secondary gap-1 px-2.5 py-1.5 text-xs text-red-600 dark:text-red-400"
              disabled={deletingId === s.id}
              onClick={() => deleteSession(s)}
            >
              {deletingId === s.id ? (
                <Spinner size="sm" />
              ) : (
                <Trash2 size={14} aria-hidden />
              )}
              {lang === 'ar' ? 'حذف' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
