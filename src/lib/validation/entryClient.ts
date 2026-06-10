import {
  isAmountOverLimit,
  isCountOverLimit,
  isImpoundOverLimit,
  validationErrorKey,
} from '@/lib/limits';
import type { EntryRow } from '@/components/EntryTable';

export function validateStandardEntry(
  rows: EntryRow[],
  impoundVehicles: number,
  impoundBikes: number,
  lang: 'ar' | 'en',
): string | null {
  if (isImpoundOverLimit(impoundVehicles)) return validationErrorKey('impoundVehicles', lang);
  if (isImpoundOverLimit(impoundBikes)) return validationErrorKey('impoundBikes', lang);

  for (const row of rows) {
    if (isCountOverLimit(row.count)) return validationErrorKey('count', lang);
    if (isAmountOverLimit(row.amount)) return validationErrorKey('amount', lang);
  }

  const hasData =
    rows.some((r) => r.count > 0 || r.amount > 0) || impoundVehicles > 0 || impoundBikes > 0;
  if (!hasData) {
    return lang === 'ar' ? 'أدخل مخالفة واحدة على الأقل أو حجزاً' : 'Enter at least one violation or impound';
  }
  return null;
}
