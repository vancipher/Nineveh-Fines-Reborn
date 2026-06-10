'use client';

import { useLang } from './LangProvider';
import { NumericInput } from './NumericInput';
import { t, formatIqd } from '@/lib/i18n';
import { MAX_FINE_AMOUNT, MAX_VIOLATION_COUNT, validationErrorKey } from '@/lib/limits';

interface AxleWeightEntryFormProps {
  count: number;
  amount: number;
  onCountChange: (v: number) => void;
  onAmountChange: (v: number) => void;
  validationError?: string;
}

export function AxleWeightEntryForm({
  count,
  amount,
  onCountChange,
  onAmountChange,
  validationError,
}: AxleWeightEntryFormProps) {
  const { lang } = useLang();

  return (
    <div className="card space-y-4">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {lang === 'ar' ? 'محطة الأوزان المحورية — إدخال مبسّط' : 'Axle weight station — simplified entry'}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {lang === 'ar'
          ? 'هذا القاطع لا يستخدم قائمة الـ ٥٩ مخالفة. أدخل العدد الإجمالي والمبلغ الإجمالي فقط.'
          : 'This sector does not use the 59-violation list. Enter total count and total amount only.'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">{t(lang, 'count')}</label>
          <NumericInput
            inputClassName="text-lg font-bold"
            min={0}
            max={MAX_VIOLATION_COUNT}
            value={count}
            onChange={onCountChange}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-600 dark:text-slate-400">{t(lang, 'amount')}</label>
          <NumericInput
            inputClassName="text-lg font-bold"
            min={0}
            max={MAX_FINE_AMOUNT}
            value={amount}
            onChange={onAmountChange}
          />
          {amount > 0 && <p className="mt-1 text-xs text-slate-500">{formatIqd(amount, lang)}</p>}
        </div>
      </div>
      {validationError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {validationError}
        </p>
      )}
    </div>
  );
}

export function validateAxleWeightEntry(count: number, amount: number, lang: 'ar' | 'en'): string | null {
  if (count > MAX_VIOLATION_COUNT) return validationErrorKey('count', lang);
  if (amount > MAX_FINE_AMOUNT) return validationErrorKey('amount', lang);
  if (count === 0 && amount === 0) {
    return lang === 'ar' ? 'أدخل عدد المخالفات أو المبلغ' : 'Enter a count or amount';
  }
  return null;
}
