const ARABIC_TO_WESTERN: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

const WESTERN_TO_ARABIC: Record<string, string> = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
};

/** Convert Eastern Arabic digits to Western (for parsing/storage). */
export function normalizeWesternDigits(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => ARABIC_TO_WESTERN[d] ?? d);
}

/** Convert Western digits to Eastern Arabic (for display/export). */
export function toArabicNumerals(value: number | string): string {
  return String(value).replace(/\d/g, (d) => WESTERN_TO_ARABIC[d] ?? d);
}

/** Parse numeric input that may use Arabic or English digits. */
export function parseLocalizedNumber(input: string): number {
  const normalized = normalizeWesternDigits(input.trim()).replace(/[^\d.-]/g, '');
  if (!normalized) return 0;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/** Strip non-digits except one decimal point for live input. */
export function sanitizeNumericInput(raw: string): string {
  const normalized = normalizeWesternDigits(raw);
  const cleaned = normalized.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join('')}`;
}
