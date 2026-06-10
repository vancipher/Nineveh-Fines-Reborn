/** Maximum violation count per line / per day entry. */
export const MAX_VIOLATION_COUNT = 9_999;

/** Maximum fine amount per violation line (IQD). */
export const MAX_FINE_AMOUNT = 500_000_000;

/** Maximum impound count per entry. */
export const MAX_IMPOUND_COUNT = 99_999;

/** Violation index for standard 59-type sectors. */
export const MAX_VIOLATION_INDEX = 59;

export function isAmountOverLimit(amount: number): boolean {
  return amount > MAX_FINE_AMOUNT;
}

export function isCountOverLimit(count: number): boolean {
  return count > MAX_VIOLATION_COUNT;
}

export function isImpoundOverLimit(value: number): boolean {
  return value > MAX_IMPOUND_COUNT;
}

export function validationErrorKey(
  field: 'count' | 'amount' | 'impoundVehicles' | 'impoundBikes',
  lang: 'ar' | 'en',
): string {
  const ar: Record<string, string> = {
    count: `العدد يتجاوز الحد الأقصى (${MAX_VIOLATION_COUNT.toLocaleString('ar-IQ')})`,
    amount: `المبلغ يتجاوز الحد الأقصى (${MAX_FINE_AMOUNT.toLocaleString('ar-IQ')} د.ع)`,
    impoundVehicles: `حجز المركبات يتجاوز الحد المسموح (${MAX_IMPOUND_COUNT.toLocaleString('ar-IQ')})`,
    impoundBikes: `حجز الدراجات يتجاوز الحد المسموح (${MAX_IMPOUND_COUNT.toLocaleString('ar-IQ')})`,
  };
  const en: Record<string, string> = {
    count: `Count exceeds maximum (${MAX_VIOLATION_COUNT.toLocaleString('en-US')})`,
    amount: `Amount exceeds maximum (${MAX_FINE_AMOUNT.toLocaleString('en-US')} IQD)`,
    impoundVehicles: `Vehicle impound exceeds maximum (${MAX_IMPOUND_COUNT.toLocaleString('en-US')})`,
    impoundBikes: `Bike impound exceeds maximum (${MAX_IMPOUND_COUNT.toLocaleString('en-US')})`,
  };
  return (lang === 'ar' ? ar : en)[field];
}
