import { toArabicNumerals } from '@/lib/numerals';

/** ISO date → Arabic-Indic yyyy/m/d (e.g. ٢٠٢٦/٤/٤). */
export function formatArabicDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return toArabicNumerals(`${Number(y)}/${Number(m)}/${Number(d)}`);
}

/** ISO date → Arabic weekday name. */
export function arabicWeekday(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('ar-IQ', { weekday: 'long' });
}

/** Period label for headers (Arabic numerals + Arabic copy). */
export function formatArabicPeriod(fromDate: string, toDate: string): string {
  if (fromDate === toDate) return formatArabicDate(toDate);
  return `${formatArabicDate(fromDate)} — ${formatArabicDate(toDate)}`;
}
