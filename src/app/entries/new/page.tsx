'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { VoicePanel } from '@/components/VoicePanel';
import { EntryTable, type EntryRow, type EntryTableHandle } from '@/components/EntryTable';
import { ViolationSearchBar } from '@/components/ViolationSearchBar';
import { AxleWeightEntryForm, validateAxleWeightEntry } from '@/components/AxleWeightEntryForm';
import { PageTitle, LoadingState } from '@/components/ui';
import { RequireRole } from '@/components/RequireRole';
import { MobileFloatingSaveBar } from '@/components/MobileFloatingSaveBar';
import { EntrySessionsPanel } from '@/components/EntrySessionsPanel';
import { ExcelImportPanel } from '@/components/ExcelImportPanel';
import { NumericInput } from '@/components/NumericInput';
import { useLang } from '@/components/LangProvider';
import { t } from '@/lib/i18n';
import { todayIso } from '@/lib/utils';
import { validateStandardEntry } from '@/lib/validation/entryClient';
import type { SttLanguage } from '@/lib/voice/stt';

interface CatalogViolation {
  id: string;
  indexNum: number;
  nameAr: string;
  nameEn: string;
}

interface CatalogSector {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  isAxleWeight?: boolean;
}

function NewEntryPage() {
  const { lang } = useLang();
  const tableRef = useRef<EntryTableHandle>(null);
  const [sectors, setSectors] = useState<CatalogSector[]>([]);
  const [violations, setViolations] = useState<CatalogViolation[]>([]);
  const [awzanViolationId, setAwzanViolationId] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [entryDate, setEntryDate] = useState(todayIso());
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);
  const [impoundVehicles, setImpoundVehicles] = useState(0);
  const [impoundBikes, setImpoundBikes] = useState(0);
  const [awzanCount, setAwzanCount] = useState(0);
  const [awzanAmount, setAwzanAmount] = useState(0);
  const [voiceLanguage, setVoiceLanguage] = useState<SttLanguage>('ar-IQ');
  const [status, setStatus] = useState('');
  const [validationError, setValidationError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sessionsKey, setSessionsKey] = useState(0);

  const selectedSector = useMemo(() => sectors.find((s) => s.id === sectorId), [sectors, sectorId]);
  const isAxleWeight = Boolean(selectedSector?.isAxleWeight);

  useEffect(() => {
    Promise.all([fetch('/api/catalog').then((r) => r.json()), fetch('/api/settings').then((r) => r.json()).catch(() => null)])
      .then(([catalog, settingsRes]) => {
        setSectors(catalog.sectors ?? []);
        setViolations(catalog.violations ?? []);
        setAwzanViolationId(catalog.awzanViolationId ?? '');
        if (catalog.sectors?.[0]) setSectorId(catalog.sectors[0].id);
        setRows(
          (catalog.violations ?? []).map((v: CatalogViolation) => ({
            violationId: v.id,
            indexNum: v.indexNum,
            nameAr: v.nameAr,
            nameEn: v.nameEn,
            count: 0,
            amount: 0,
          })),
        );
        if (settingsRes?.voiceLanguage) setVoiceLanguage(settingsRes.voiceLanguage);
      })
      .finally(() => setLoading(false));
  }, []);

  function clearEntryForm() {
    setRows((prev) => prev.map((row) => ({ ...row, count: 0, amount: 0 })));
    setImpoundVehicles(0);
    setImpoundBikes(0);
    setAwzanCount(0);
    setAwzanAmount(0);
    setHighlightIndex(null);
    setValidationError('');
  }

  const maxViolationIndex = useMemo(
    () => rows.reduce((max, row) => Math.max(max, row.indexNum), 1),
    [rows],
  );

  const totals = useMemo(() => {
    if (isAxleWeight) return { count: awzanCount, amount: awzanAmount };
    return {
      count: rows.reduce((a, r) => a + r.count, 0),
      amount: rows.reduce((a, r) => a + r.amount, 0),
    };
  }, [isAxleWeight, awzanCount, awzanAmount, rows]);

  function onVoiceParsed(result: { violationIndex: number; count: number; amount: number }) {
    if (isAxleWeight) {
      setAwzanCount(result.count);
      setAwzanAmount(result.amount);
      return;
    }
    setHighlightIndex(result.violationIndex);
    setRows((prev) =>
      prev.map((row) =>
        row.indexNum === result.violationIndex
          ? { ...row, count: result.count, amount: result.amount }
          : row,
      ),
    );
    tableRef.current?.scrollToIndex(result.violationIndex);
    setTimeout(() => setHighlightIndex(null), 2500);
  }

  function onChange(indexNum: number, field: 'count' | 'amount', value: number) {
    setRows((prev) => prev.map((row) => (row.indexNum === indexNum ? { ...row, [field]: value } : row)));
  }

  async function saveEntry() {
    setValidationError('');
    const uiLang = lang;

    if (isAxleWeight) {
      const err = validateAxleWeightEntry(awzanCount, awzanAmount, uiLang);
      if (err) {
        setValidationError(err);
        return;
      }
    } else {
      const err = validateStandardEntry(rows, impoundVehicles, impoundBikes, uiLang);
      if (err) {
        setValidationError(err);
        return;
      }
    }

    const lines = isAxleWeight
      ? [
          {
            violationId: awzanViolationId,
            indexNum: 60,
            count: awzanCount,
            amount: awzanAmount,
          },
        ]
      : rows.map((r) => ({
          violationId: r.violationId,
          indexNum: r.indexNum,
          count: r.count,
          amount: r.amount,
        }));

    setSaving(true);
    setStatus('');
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectorId,
        entryDate,
        impoundVehicles: isAxleWeight ? 0 : impoundVehicles,
        impoundBikes: isAxleWeight ? 0 : impoundBikes,
        simplifiedAxleWeight: isAxleWeight,
        lines,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setStatus(
        lang === 'ar'
          ? 'تم حفظ الجلسة كسجل منفصل — يمكنك حذفها من القائمة أدناه'
          : 'Session saved separately — delete from the list below if needed',
      );
      clearEntryForm();
      setSessionsKey((k) => k + 1);
    } else {
      const data = await res.json().catch(() => ({}));
      setValidationError(typeof data.error === 'string' ? data.error : t(lang, 'error'));
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-5 pb-32 md:pb-6">
      <PageTitle title={t(lang, 'newEntry')} subtitle={t(lang, 'manualEdit')} />

      <ExcelImportPanel />

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm text-slate-600">{t(lang, 'sector')}</label>
          <select
            className="input"
            value={sectorId}
            onChange={(e) => {
              setSectorId(e.target.value);
              clearEntryForm();
            }}
          >
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {lang === 'ar' ? s.nameAr : s.nameEn}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600">{t(lang, 'date')}</label>
          <input className="input" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </div>
        <div className="hidden items-end gap-2 md:flex">
          <button type="button" className="btn-primary w-full" onClick={saveEntry} disabled={saving}>
            {saving ? '...' : t(lang, 'save')}
          </button>
        </div>
      </div>

      {isAxleWeight ? (
        <AxleWeightEntryForm
          count={awzanCount}
          amount={awzanAmount}
          onCountChange={setAwzanCount}
          onAmountChange={setAwzanAmount}
          validationError={validationError}
        />
      ) : (
        <>
          <VoicePanel
            voiceLanguage={voiceLanguage}
            violations={violations.map((v) => ({ indexNum: v.indexNum, nameAr: v.nameAr, nameEn: v.nameEn }))}
            onParsed={onVoiceParsed}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-slate-600">{t(lang, 'impoundVehicles')}</label>
              <NumericInput value={impoundVehicles} onChange={setImpoundVehicles} min={0} />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-600">{t(lang, 'impoundBikes')}</label>
              <NumericInput value={impoundBikes} onChange={setImpoundBikes} min={0} />
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <ViolationSearchBar
              embedded
              maxIndex={maxViolationIndex}
              onJump={(indexNum) => {
                tableRef.current?.scrollToIndex(indexNum);
                requestAnimationFrame(() => tableRef.current?.scrollToIndex(indexNum));
              }}
            />
            <EntryTable
              ref={tableRef}
              embedded
              rows={rows}
              highlightIndex={highlightIndex}
              onChange={onChange}
            />
          </div>
        </>
      )}

      <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-dark-elevated dark:text-dark-text">
        {t(lang, 'totalViolations')}: {totals.count.toLocaleString(lang === 'ar' ? 'ar-IQ' : 'en-IQ')} —{' '}
        {t(lang, 'totalAmount')}: {totals.amount.toLocaleString(lang === 'ar' ? 'ar-IQ' : 'en-IQ')}
      </div>

      {validationError && !isAxleWeight && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {validationError}
        </p>
      )}
      {status && <p className="text-sm text-green-700 dark:text-green-400">{status}</p>}

      <EntrySessionsPanel
        key={sessionsKey}
        sectorId={sectorId}
        entryDate={entryDate}
        onDeleted={() => setSessionsKey((k) => k + 1)}
      />

      <MobileFloatingSaveBar onSave={saveEntry} saving={saving} />
    </div>
  );
}

export default function NewEntryPageWrapper() {
  return (
    <RequireRole allow={['operator', 'admin', 'superadmin']}>
      <NewEntryPage />
    </RequireRole>
  );
}
