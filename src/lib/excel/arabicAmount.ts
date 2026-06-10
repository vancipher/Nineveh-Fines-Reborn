const ONES: Record<number, string> = {
  0: 'صفر',
  1: 'واحد',
  2: 'اثنان',
  3: 'ثلاثة',
  4: 'أربعة',
  5: 'خمسة',
  6: 'ستة',
  7: 'سبعة',
  8: 'ثمانية',
  9: 'تسعة',
  10: 'عشرة',
  11: 'أحد عشر',
  12: 'اثنا عشر',
  13: 'ثلاثة عشر',
  14: 'أربعة عشر',
  15: 'خمسة عشر',
  16: 'ستة عشر',
  17: 'سبعة عشر',
  18: 'ثمانية عشر',
  19: 'تسعة عشر',
};

const TENS: Record<number, string> = {
  2: 'عشرون',
  3: 'ثلاثون',
  4: 'أربعون',
  5: 'خمسون',
  6: 'ستون',
  7: 'سبعون',
  8: 'ثمانون',
  9: 'تسعون',
};

const HUNDREDS: Record<number, string> = {
  1: 'مئة',
  2: 'مئتان',
  3: 'ثلاثمئة',
  4: 'أربعمئة',
  5: 'خمسمئة',
  6: 'ستمئة',
  7: 'سبعمئة',
  8: 'ثمانمئة',
  9: 'تسعمائة',
};

function joinParts(parts: string[]): string {
  return parts.filter(Boolean).join(' و');
}

function convertUnder100(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n] ?? '';
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return TENS[tens] ?? '';
  return `${ONES[ones]} و${TENS[tens]}`;
}

function convertUnder1000(n: number): string {
  if (n === 0) return '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(HUNDREDS[hundreds] ?? '');
  if (remainder > 0) parts.push(convertUnder100(remainder));
  return joinParts(parts);
}

function scaleWord(n: number, singular: string, dual: string, plural: string): string {
  if (n === 0) return '';
  if (n === 1) return singular;
  if (n === 2) return dual;
  if (n >= 3 && n <= 10) return `${convertUnder1000(n)} ${plural}`;
  return `${convertUnder1000(n)} ${singular}`;
}

/** Convert a whole number to Arabic words (Iraqi official report style). */
export function integerToArabicWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'صفر';

  const parts: string[] = [];
  const billions = Math.floor(n / 1_000_000_000);
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1000;

  if (billions > 0) parts.push(scaleWord(billions, 'مليار', 'ملياران', 'مليارات'));
  if (millions > 0) parts.push(scaleWord(millions, 'مليون', 'مليونان', 'ملايين'));
  if (thousands > 0) {
    if (thousands === 1) parts.push('الف');
    else if (thousands === 2) parts.push('الفان');
    else parts.push(`${convertUnder1000(thousands)} الف`);
  }
  if (remainder > 0) parts.push(convertUnder1000(remainder));

  return joinParts(parts);
}

export function formatAmountDisplay(value: number): string {
  return Math.floor(value).toLocaleString('en-US');
}

export function formatDeferredFinesFooter(amount: number): string {
  const rounded = Math.floor(amount);
  const digits = formatAmountDisplay(rounded);
  const words = integerToArabicWords(rounded);
  return `مجموع مبلغ الغرامات الاجلة (${digits}) ${words} دينار فقط`;
}
