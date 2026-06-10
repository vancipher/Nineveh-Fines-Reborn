'use client';



import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PngExportButton } from '@/components/PngExportButton';

import { useLang } from '@/components/LangProvider';

import { EntryTable, type EntryRow } from '@/components/EntryTable';
import { AxleWeightEntryForm, validateAxleWeightEntry } from '@/components/AxleWeightEntryForm';
import { validateStandardEntry } from '@/lib/validation/entryClient';

import { NumericInput } from '@/components/NumericInput';
import { PageTitle, SectorBar, StatCard, LoadingState } from '@/components/ui';

import { formatIqd, t } from '@/lib/i18n';
import { cn } from '@/lib/utils';



type StatsScope = 'today' | 'all';

interface DashboardData {
  scope?: StatsScope;
  totals: { count: number; amount: number };
  allTime?: { count: number; amount: number };
  today: { count: number; amount: number };
  week: { count: number; amount: number };
  perSector: Array<{ nameAr: string; nameEn: string; totalCount: number; totalAmount: number }>;
}



interface SavedEntry {

  id: string;

  sectorId: string;

  entryDate: string;

  nameAr: string;

  nameEn: string;

  totalCount: number;

  totalAmount: number;

  impoundVehicles: number;

  impoundBikes: number;

}



interface CatalogViolation {

  id: string;

  indexNum: number;

  nameAr: string;

  nameEn: string;

}



export default function DashboardPage() {
  const { lang } = useLang();
  const statsRef = useRef<HTMLDivElement>(null);
  const sectorChartRef = useRef<HTMLDivElement>(null);

  const [data, setData] = useState<DashboardData | null>(null);

  const [statsScope, setStatsScope] = useState<StatsScope>('today');

  const [canEdit, setCanEdit] = useState(false);

  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>([]);

  const [violations, setViolations] = useState<CatalogViolation[]>([]);

  const [sectors, setSectors] = useState<Array<{ id: string; slug: string; isAxleWeight?: boolean }>>([]);

  const [awzanViolationId, setAwzanViolationId] = useState('');

  const [editAwzanCount, setEditAwzanCount] = useState(0);

  const [editAwzanAmount, setEditAwzanAmount] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [editSectorId, setEditSectorId] = useState('');

  const [editDate, setEditDate] = useState('');

  const [editRows, setEditRows] = useState<EntryRow[]>([]);

  const [editImpoundVehicles, setEditImpoundVehicles] = useState(0);

  const [editImpoundBikes, setEditImpoundBikes] = useState(0);

  const [editStatus, setEditStatus] = useState('');

  const [editLoading, setEditLoading] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [bulkDeleting, setBulkDeleting] = useState(false);



  const loadStats = useCallback((scope: StatsScope) => {
    fetch(`/api/dashboard?scope=${scope}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, []);



  const loadSavedEntries = useCallback(() => {

    fetch('/api/entries?list=1')

      .then((r) => r.json())

      .then((d) => setSavedEntries(d.entries ?? []))

      .catch(() => setSavedEntries([]));

  }, []);



  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) =>
        setCanEdit(
          d.user?.role === 'admin' || d.user?.role === 'operator' || d.user?.role === 'superadmin',
        ),
      )
      .catch(() => setCanEdit(false));
  }, []);

  useEffect(() => {
    loadStats(statsScope);
  }, [statsScope, loadStats]);



  useEffect(() => {

    if (!canEdit) return;

    loadSavedEntries();

    fetch('/api/catalog')

      .then((r) => r.json())

      .then((d) => {
        setViolations(d.violations ?? []);
        setSectors(d.sectors ?? []);
        setAwzanViolationId(d.awzanViolationId ?? '');
      })

      .catch(() => setViolations([]));

  }, [canEdit, loadSavedEntries]);



  const maxSectorCount = useMemo(

    () => Math.max(...(data?.perSector.map((s) => s.totalCount) ?? [0]), 1),

    [data],

  );



  async function startEdit(entry: SavedEntry) {

    setEditLoading(true);

    setEditStatus('');

    let vList = violations;

    if (vList.length === 0) {

      const cat = await fetch('/api/catalog').then((r) => r.json());

      vList = cat.violations ?? [];

      setViolations(vList);

    }

    const res = await fetch(`/api/entries?id=${entry.id}`);

    const detail = await res.json();

    setEditLoading(false);

    if (!res.ok) {

      setEditStatus(t(lang, 'error'));

      return;

    }



    setEditingId(entry.id);

    setEditSectorId(entry.sectorId);

    setEditDate(entry.entryDate);

    setEditImpoundVehicles(detail.entry?.impoundVehicles ?? 0);

    setEditImpoundBikes(detail.entry?.impoundBikes ?? 0);

    const sectorMeta = sectors.find((s) => s.id === entry.sectorId);
    const axle = sectorMeta?.isAxleWeight ?? sectorMeta?.slug === 'awzan';

    if (axle) {
      let count = 0;
      let amount = 0;
      for (const line of detail.lines ?? []) {
        count += line.count ?? 0;
        amount += line.amount ?? 0;
      }
      setEditAwzanCount(count);
      setEditAwzanAmount(amount);
      setEditRows([]);
    } else {
      setEditAwzanCount(0);
      setEditAwzanAmount(0);
      setEditRows(
        vList.map((v) => {
          const line = detail.lines?.find((l: { violationId: string }) => l.violationId === v.id);
          return {
            violationId: v.id,
            indexNum: v.indexNum,
            nameAr: v.nameAr,
            nameEn: v.nameEn,
            count: line?.count ?? 0,
            amount: line?.amount ?? 0,
          };
        }),
      );
    }

  }



  function cancelEdit() {

    setEditingId(null);

    setEditStatus('');

  }



  function onEditChange(indexNum: number, field: 'count' | 'amount', value: number) {

    setEditRows((prev) => prev.map((row) => (row.indexNum === indexNum ? { ...row, [field]: value } : row)));

  }



  async function saveEdit() {

    if (!editingId) return;

    const sectorMeta = sectors.find((s) => s.id === editSectorId);
    const axle = sectorMeta?.isAxleWeight ?? sectorMeta?.slug === 'awzan';
    const uiLang = lang;

    if (axle) {
      const err = validateAxleWeightEntry(editAwzanCount, editAwzanAmount, uiLang);
      if (err) {
        setEditStatus(err);
        return;
      }
    } else {
      const err = validateStandardEntry(editRows, editImpoundVehicles, editImpoundBikes, uiLang);
      if (err) {
        setEditStatus(err);
        return;
      }
    }

    setEditLoading(true);

    setEditStatus('');

    const lines = axle
      ? [{ violationId: awzanViolationId, indexNum: 60, count: editAwzanCount, amount: editAwzanAmount }]
      : editRows.map((r) => ({
          violationId: r.violationId,
          indexNum: r.indexNum,
          count: r.count,
          amount: r.amount,
        }));

    const res = await fetch('/api/entries', {

      method: 'PUT',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({

        id: editingId,

        sectorId: editSectorId,

        entryDate: editDate,

        impoundVehicles: axle ? 0 : editImpoundVehicles,

        impoundBikes: axle ? 0 : editImpoundBikes,

        simplifiedAxleWeight: axle,

        lines,

      }),

    });

    setEditLoading(false);

    if (!res.ok) {

      setEditStatus(t(lang, 'error'));

      return;

    }

    setEditStatus(t(lang, 'saved'));

    setEditingId(null);

    loadStats(statsScope);

    loadSavedEntries();

  }



  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === savedEntries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(savedEntries.map((e) => e.id)));
    }
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const firstOk = window.confirm(
      lang === 'ar'
        ? `حذف ${count} جلسة محددة؟`
        : `Delete ${count} selected session(s)?`,
    );
    if (!firstOk) return;

    const secondOk = window.confirm(
      lang === 'ar'
        ? `تأكيد نهائي: حذف ${count} جلسة نهائياً ولا يمكن التراجع.`
        : `Final confirmation: permanently delete ${count} session(s). This cannot be undone.`,
    );
    if (!secondOk) return;

    setBulkDeleting(true);
    setEditStatus('');
    const ids = [...selectedIds];
    const results = await Promise.all(
      ids.map((id) => fetch(`/api/entries?id=${id}`, { method: 'DELETE' }).then((r) => r.ok)),
    );
    setBulkDeleting(false);

    const failed = results.filter((ok) => !ok).length;
    if (failed > 0) {
      setEditStatus(
        lang === 'ar'
          ? `فشل حذف ${failed} من ${count} جلسة`
          : `Failed to delete ${failed} of ${count} session(s)`,
      );
    } else {
      setEditStatus(lang === 'ar' ? `تم حذف ${count} جلسة` : `Deleted ${count} session(s)`);
      setSelectedIds(new Set());
    }
    loadStats(statsScope);
    loadSavedEntries();
  }

  async function deleteEdit() {

    if (!editingId) return;

    const firstOk = window.confirm(
      lang === 'ar' ? 'حذف هذا السجل بالكامل؟' : 'Delete this saved entry completely?',
    );
    if (!firstOk) return;

    const secondOk = window.confirm(
      lang === 'ar'
        ? 'تأكيد نهائي: حذف هذا السجل نهائياً ولا يمكن التراجع.'
        : 'Final confirmation: permanently delete this record. This cannot be undone.',
    );
    if (!secondOk) return;

    setEditLoading(true);

    const res = await fetch(`/api/entries?id=${editingId}`, { method: 'DELETE' });

    setEditLoading(false);

    if (!res.ok) {

      setEditStatus(t(lang, 'error'));

      return;

    }

    setEditingId(null);

    setEditStatus(lang === 'ar' ? 'تم الحذف' : 'Deleted');

    loadStats(statsScope);

    loadSavedEntries();

  }



  if (!data) return <LoadingState />;

  const scopeLabel =
    statsScope === 'today'
      ? lang === 'ar'
        ? 'اليوم'
        : 'Today'
      : lang === 'ar'
        ? 'كل الوقت'
        : 'All time';

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <PageTitle title={t(lang, 'dashboard')} />
        <PngExportButton
          targetRef={statsRef}
          filename={`dashboard-stats_${today}`}
          label={lang === 'ar' ? 'PNG' : 'PNG'}
          className="shrink-0 text-xs"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={statsScope === 'today' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setStatsScope('today')}
        >
          {lang === 'ar' ? 'بيانات اليوم' : 'Today'}
        </button>
        <button
          type="button"
          className={statsScope === 'all' ? 'btn-primary' : 'btn-secondary'}
          onClick={() => setStatsScope('all')}
        >
          {lang === 'ar' ? 'كل الوقت' : 'All time'}
        </button>
      </div>

      <div ref={statsRef} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard
          label={
            statsScope === 'today'
              ? lang === 'ar'
                ? 'مخالفات اليوم'
                : "Today's violations"
              : lang === 'ar'
                ? 'إجمالي المخالفات'
                : 'All-time violations'
          }
          count={data.totals.count}
          amount={data.totals.amount}
          index={0}
        />
        <StatCard
          label={t(lang, 'thisWeek')}
          count={data.week.count}
          amount={data.week.amount}
          index={1}
        />
      </div>

      {/* Sector analytics */}
      <div className="card" ref={sectorChartRef}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {lang === 'ar'
              ? `القواطع — عدد المخالفات (${scopeLabel})`
              : `Sectors — violation counts (${scopeLabel})`}
          </h2>
          <PngExportButton
            targetRef={sectorChartRef}
            filename={`dashboard-sectors_${today}`}
            label="PNG"
            className="shrink-0 text-xs"
          />
        </div>
        <div className="space-y-4">
          {data.perSector.map((s, i) => (
            <SectorBar
              key={s.nameAr}
              name={lang === 'ar' ? s.nameAr : s.nameEn}
              count={s.totalCount}
              amount={s.totalAmount}
              max={maxSectorCount}
              index={i}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-800 dark:border-dark-border dark:text-slate-200">
          <span>{lang === 'ar' ? 'الإجمالي الكلي' : 'Grand total'}</span>
          <span className="tabular-nums">
            {formatIqd(data.totals.count, lang)}{' '}
            <span className="font-normal text-slate-500 dark:text-slate-400">
              {t(lang, 'totalViolations').toLowerCase()}
            </span>
            {' · '}
            <span className="text-brand-600 dark:text-brand-400">
              {formatIqd(data.totals.amount, lang)} IQD
            </span>
          </span>
        </div>
      </div>

      {/* Edit saved data (admin/operator) */}
      {canEdit && (
        <div className="card space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {lang === 'ar' ? 'تصحيح البيانات المحفوظة' : 'Edit saved data'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {lang === 'ar'
                ? 'كل جلسة إدخال محفوظة منفصلة — احذف جلسة واحدة دون التأثير على باقي القواطع. التصدير يجمع كل الجلسات.'
                : 'Each saved entry is a separate session — delete one without affecting others. Export aggregates all.'}
            </p>
          </div>

          {editingId ? (
            <div className="space-y-4 rounded-xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-500/30 dark:bg-dark-elevated">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t(lang, 'date')}
                  </label>
                  <input
                    className="input"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t(lang, 'impoundVehicles')}
                  </label>
                  <NumericInput className="w-full" min={0} value={editImpoundVehicles} onChange={setEditImpoundVehicles} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    {t(lang, 'impoundBikes')}
                  </label>
                  <NumericInput className="w-full" min={0} value={editImpoundBikes} onChange={setEditImpoundBikes} />
                </div>
              </div>

              {sectors.find((s) => s.id === editSectorId)?.isAxleWeight ||
              sectors.find((s) => s.id === editSectorId)?.slug === 'awzan' ? (
                <AxleWeightEntryForm
                  count={editAwzanCount}
                  amount={editAwzanAmount}
                  onCountChange={setEditAwzanCount}
                  onAmountChange={setEditAwzanAmount}
                />
              ) : (
                <EntryTable rows={editRows} highlightIndex={null} onChange={onEditChange} />
              )}

              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={saveEdit} disabled={editLoading}>
                  {editLoading ? <span className="opacity-70">...</span> : t(lang, 'save')}
                </button>
                <button type="button" className="btn-secondary" onClick={cancelEdit} disabled={editLoading}>
                  {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-red-600 hover:border-red-300 hover:bg-red-50 dark:text-red-400"
                  onClick={deleteEdit}
                  disabled={editLoading}
                >
                  {lang === 'ar' ? 'حذف السجل' : 'Delete record'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {savedEntries.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedIds.size > 0
                      ? lang === 'ar'
                        ? `${selectedIds.size} محددة`
                        : `${selectedIds.size} selected`
                      : lang === 'ar'
                        ? 'حدد الجلسات للحذف الجماعي'
                        : 'Select sessions for bulk delete'}
                  </p>
                  {selectedIds.size > 0 && (
                    <button
                      type="button"
                      className="btn-secondary text-xs text-red-600 dark:text-red-400"
                      disabled={bulkDeleting}
                      onClick={deleteSelected}
                    >
                      {bulkDeleting
                        ? lang === 'ar'
                          ? 'جاري الحذف...'
                          : 'Deleting...'
                        : lang === 'ar'
                          ? `حذف المحدد (${selectedIds.size})`
                          : `Delete selected (${selectedIds.size})`}
                    </button>
                  )}
                </div>
              )}
            <div className="table-scroll rounded-xl border border-slate-200 dark:border-dark-border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-start dark:bg-dark-elevated">
                    <th className="w-10 px-2 py-2.5">
                      {savedEntries.length > 0 && (
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={selectedIds.size === savedEntries.length && savedEntries.length > 0}
                          onChange={toggleSelectAll}
                          aria-label={lang === 'ar' ? 'تحديد الكل' : 'Select all'}
                        />
                      )}
                    </th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{t(lang, 'date')}</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{t(lang, 'sector')}</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{t(lang, 'count')}</th>
                    <th className="px-3 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{t(lang, 'amount')}</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {savedEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                        {lang === 'ar' ? 'لا توجد سجلات محفوظة بعد.' : 'No saved records yet.'}
                      </td>
                    </tr>
                  ) : (
                    savedEntries.map((entry) => (
                      <tr
                        key={entry.id}
                        className={cn(
                          'border-t border-slate-100 transition-colors hover:bg-slate-50 dark:border-dark-border dark:hover:bg-dark-hover',
                          selectedIds.has(entry.id) && 'bg-brand-50/50 dark:bg-dark-elevated',
                        )}
                      >
                        <td className="px-2 py-2.5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={selectedIds.has(entry.id)}
                            onChange={() => toggleSelect(entry.id)}
                            aria-label={lang === 'ar' ? entry.nameAr : entry.nameEn}
                          />
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{entry.entryDate}</td>
                        <td className="px-3 py-2.5">{lang === 'ar' ? entry.nameAr : entry.nameEn}</td>
                        <td className="px-3 py-2.5 tabular-nums">{entry.totalCount}</td>
                        <td className="px-3 py-2.5 tabular-nums">{entry.totalAmount.toLocaleString()}</td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            className="btn-secondary px-2.5 py-1 text-xs"
                            onClick={() => startEdit(entry)}
                            disabled={editLoading || violations.length === 0}
                          >
                            {lang === 'ar' ? 'تعديل' : 'Edit'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            </>
          )}

          {editStatus && (
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{editStatus}</p>
          )}
        </div>
      )}
    </div>
  );
}


