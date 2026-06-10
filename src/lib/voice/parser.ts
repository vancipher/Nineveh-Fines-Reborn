const ARABIC_DIGITS: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/**
 * Normalize an Arabic word token before number-word lookup:
 *  - Collapse all alef variants → ا
 *  - ta marbuta (ة) → ha (ه)  ← STT almost always writes ه at word end
 *  - alef maqsura (ى) → ya (ي)
 *  - Strip all diacritics (harakat, shadda, etc.)
 */
function normalizeWordForLookup(token: string): string {
  return token
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '');
}

/**
 * All keys are pre-normalized (ه not ة, ا not إأآ) so the lookup works
 * regardless of which form the STT or user types.
 */
const ARABIC_WORDS: Record<string, number> = {
  // 0–10 — both full and short forms, Iraqi + Gulf pronunciations
  'صفر': 0,
  'واحد': 1, 'واحده': 1, 'احد': 1,
  'اثنان': 2, 'اثنين': 2, 'اثنا': 2, 'اتنان': 2, 'اتنين': 2,
  'ثلاثه': 3, 'ثلاث': 3,
  'اربعه': 4, 'اربع': 4,
  'خمسه': 5, 'خمس': 5,
  'سته': 6, 'ست': 6,
  'سبعه': 7, 'سبع': 7,
  'ثمانيه': 8, 'ثماني': 8, 'ثمان': 8,
  'تسعه': 9, 'تسع': 9,
  'عشره': 10, 'عشر': 10,
  // teens
  'احد عشر': 11, 'اثنا عشر': 12, 'ثلاثه عشر': 13, 'اربعه عشر': 14,
  'خمسه عشر': 15, 'سته عشر': 16, 'سبعه عشر': 17, 'ثمانيه عشر': 18, 'تسعه عشر': 19,
  // tens
  'عشرون': 20, 'عشرين': 20,
  'ثلاثون': 30, 'ثلاثين': 30,
  'اربعون': 40, 'اربعين': 40,
  'خمسون': 50, 'خمسين': 50,
  // hundreds / thousands
  'ماءه': 100, 'مائه': 100, 'ميه': 100,
  'ماءتان': 200, 'ماءتين': 200, 'ماءتا': 200,
  'الف': 1000, 'الفان': 2000, 'الاف': 1000, 'اف': 1000,
  // large
  'مليون': 1_000_000, 'مليونا': 1_000_000, 'ملايين': 1_000_000,
  'مليار': 1_000_000_000, 'مليارا': 1_000_000_000, 'مليارات': 1_000_000_000,
  'بليون': 1_000_000_000, 'بليونا': 1_000_000_000,
};

const SCALE_MULTIPLIERS = new Set([100, 1000, 1_000_000, 1_000_000_000]);

export type VoiceStep = 'violation' | 'count' | 'amount';

export interface ViolationSpeechRef {
  indexNum: number;
  nameAr: string;
  nameEn?: string;
}

export interface ParsedVoiceCommand {
  violationIndex: number;
  count: number;
  amount: number;
  raw: string;
}

function normalizeText(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (d) => ARABIC_DIGITS[d] ?? d)
    .replace(/[,،]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseNumberToken(token: string): number | null {
  if (!token) return null;
  const digits = token.replace(/[^\d.]/g, '');
  if (digits && /^\d+$/.test(digits)) return Number(digits);
  const normalized = normalizeWordForLookup(token);
  if (ARABIC_WORDS[normalized] !== undefined) return ARABIC_WORDS[normalized];
  return null;
}

function parseArabicAmountPhrase(text: string): number | null {
  const parts = text.split(/\s+/).filter(Boolean);
  let total = 0;
  let current = 0;
  for (const part of parts) {
    const n = parseNumberToken(part);
    if (n === null) continue;
    if (SCALE_MULTIPLIERS.has(n)) {
      current = current === 0 ? n : current * n;
    } else {
      current += n;
    }
  }
  total += current;
  return total > 0 ? total : null;
}

/** Parse IQD amounts from digits, grouped digits, or Arabic phrases like «100 ألف». */
function parseAmountValue(text: string): number | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  // «5 مليار» / «2 billion» / «100 million» / «100 ألف»
  const timesBillion = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(?:مليار(?:ات)?|بليون(?:ات)?|billion|bln|\bb\b)/,
  );
  if (timesBillion) {
    return Math.floor(Number(timesBillion[1].replace(',', '.')) * 1_000_000_000);
  }

  const timesMillion = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(?:مليون(?:ات)?|million|mln|\bm\b(?!\w))/,
  );
  if (timesMillion) {
    return Math.floor(Number(timesMillion[1].replace(',', '.')) * 1_000_000);
  }

  const timesThousand = normalized.match(
    /(\d+(?:[.,]\d+)?)\s*(?:ألف|الف|الاف|آلاف|alf|thousand|k\b)/,
  );
  if (timesThousand) {
    return Math.floor(Number(timesThousand[1].replace(',', '.')) * 1000);
  }

  // «100 000» or «100,000» style grouping
  const groupedDigits = normalized.match(/(\d(?:[\d\s,،]*\d|\d))/);
  if (groupedDigits) {
    const compact = groupedDigits[0].replace(/[\s,،]/g, '');
    if (/^\d+$/.test(compact)) {
      const n = Number(compact);
      if (n >= 0) return Math.floor(n);
    }
  }

  // Pure digit run
  const allDigits = normalized.replace(/[^\d]/g, '');
  if (allDigits.length >= 1 && /^\d+$/.test(allDigits)) {
    return Math.floor(Number(allDigits));
  }

  const spoken = parseArabicAmountPhrase(normalized);
  if (spoken !== null && spoken >= 0) return Math.floor(spoken);

  return null;
}

function normalizeArabicForMatch(input: string): string {
  return normalizeText(input)
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const MATCH_STOP_WORDS = new Set([
  'في', 'من', 'على', 'الى', 'إلى', 'عن', 'مع', 'او', 'أو', 'the', 'and', 'or', 'of', 'for', 'a',
]);

function tokenizeMatchWords(text: string): string[] {
  return normalizeArabicForMatch(text)
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !MATCH_STOP_WORDS.has(w));
}

function scoreViolationTitleMatch(speech: string, nameAr: string, nameEn?: string): number {
  const s = normalizeArabicForMatch(speech);
  const ar = normalizeArabicForMatch(nameAr);
  const en = nameEn ? normalizeArabicForMatch(nameEn) : '';
  if (!s || !ar) return 0;
  if (ar.includes(s) || s.includes(ar)) return 1;
  if (en && (en.includes(s) || s.includes(en))) return 0.95;

  const speechWords = tokenizeMatchWords(speech);
  const nameWords = tokenizeMatchWords(nameAr);
  if (nameWords.length === 0) return 0;

  let matched = 0;
  for (const nw of nameWords) {
    if (speechWords.some((sw) => sw.includes(nw) || nw.includes(sw))) matched += 1;
  }
  const nameRatio = matched / nameWords.length;
  const speechHits = speechWords.filter((sw) => nameWords.some((nw) => sw.includes(nw) || nw.includes(sw))).length;
  const speechRatio = speechWords.length ? speechHits / speechWords.length : 0;
  return Math.max(nameRatio, speechRatio, matched >= 2 ? 0.55 : 0);
}

/** Match violation # from digits/words or spoken Arabic/English title. */
export function parseViolationIndex(text: string, violations?: ViolationSpeechRef[]): number | null {
  const raw = text.trim();
  if (!raw) return null;
  const normalized = normalizeText(raw);

  const labeled =
    normalized.match(/(?:violation|مخالف(?:ة|ه)?|رقم)\s*(\d{1,2})/)?.[1] ??
    normalized.match(/^(\d{1,2})\b/)?.[1];
  if (labeled) {
    const n = Number(labeled);
    if (n >= 1 && n <= 59) return n;
  }

  const n = firstSpokenNumber(normalized);
  if (n !== null && n >= 1 && n <= 59) return Math.floor(n);

  if (!violations?.length) return null;

  let best: { index: number; score: number } | null = null;
  let secondBest = 0;
  for (const v of violations) {
    const score = scoreViolationTitleMatch(raw, v.nameAr, v.nameEn);
    if (!best || score > best.score) {
      secondBest = best?.score ?? 0;
      best = { index: v.indexNum, score };
    } else if (score > secondBest) {
      secondBest = score;
    }
  }

  if (!best || best.score < 0.35) return null;
  if (best.score < 0.55 && best.score - secondBest < 0.12) return null;
  return best.index;
}

function firstSpokenNumber(text: string): number | null {
  const normalized = normalizeText(text);
  const digitMatch = normalized.match(/\d+/);
  if (digitMatch) return Number(digitMatch[0]);

  // Try 2-word combinations first (e.g. "خمسه عشر" → 15, "اربعه عشر" → 14)
  const tokens = normalized.split(/\s+/).filter(Boolean);
  for (let i = 0; i < tokens.length - 1; i++) {
    const pair = `${normalizeWordForLookup(tokens[i])} ${normalizeWordForLookup(tokens[i + 1])}`;
    if (ARABIC_WORDS[pair] !== undefined) return ARABIC_WORDS[pair];
  }

  // Single token scan
  for (const token of tokens) {
    const n = parseNumberToken(token);
    if (n !== null) return n;
  }

  return parseArabicAmountPhrase(normalized);
}

/** Parse a single value for the guided step-by-step mic flow. */
export function parseStepValue(text: string, step: VoiceStep, violations?: ViolationSpeechRef[]): number | null {
  const raw = text.trim();
  if (!raw) return null;

  if (step === 'violation') {
    return parseViolationIndex(raw, violations);
  }

  const normalized = normalizeText(raw);

  if (step === 'count') {
    const labeled = normalized.match(/(?:count|cases|عدد|العدد)\s*(\d+)/)?.[1];
    if (labeled) return Math.floor(Number(labeled));
    const n = firstSpokenNumber(normalized);
    if (n !== null && n >= 0 && n <= 9999) return Math.floor(n);
    return null;
  }

  const labeled = normalized.match(/(?:amount|المبلغ|مبلغ)\s*(.+)$/)?.[1];
  const amountText = labeled ?? normalized;
  return parseAmountValue(amountText);
}

function extractAfterKeywords(text: string, keywords: string[]): string | null {
  for (const kw of keywords) {
    const idx = text.indexOf(kw);
    if (idx >= 0) {
      return text.slice(idx + kw.length).trim();
    }
  }
  return null;
}

export function parseVoiceCommand(rawInput: string): ParsedVoiceCommand | null {
  const raw = rawInput.trim();
  if (!raw) return null;
  const text = normalizeText(raw);

  let violationIndex: number | null = null;
  let count: number | null = null;
  let amount: number | null = null;

  const violationMatch =
    text.match(/(?:violation|مخالف(?:ة|ه)?)\s*(\d{1,2})/i) ??
    text.match(/(?:رقم|number|#)\s*(\d{1,2})/i) ??
    text.match(/^(\d{1,2})\s*(?:[-،,]|$)/);

  if (violationMatch) {
    violationIndex = Number(violationMatch[1]);
  }

  const countMatch = text.match(/(?:count|cases|العدد|عدد)\s*[:\-]?\s*(\d+|[\u0600-\u06FF]+)/i);

  if (countMatch) {
    count = parseNumberToken(countMatch[1]) ?? Number(countMatch[1].replace(/\D/g, ''));
  }

  const amountSection =
    extractAfterKeywords(text, ['amount', 'المبلغ', 'مبلغ']) ??
    text.match(/(?:amount|المبلغ|مبلغ)\s*[:\-]?\s*(.+)$/i)?.[1];

  if (amountSection) {
    amount = parseAmountValue(amountSection);
  }

  const commaParts = text.split(/[,،]/).map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 3) {
    if (!violationIndex) {
      const m = commaParts[0].match(/(\d{1,2})/);
      if (m) violationIndex = Number(m[1]);
    }
    if (!count) {
      const m = commaParts[1].match(/(\d+)/);
      if (m) count = Number(m[1]);
    }
    if (!amount) {
      amount = parseAmountValue(commaParts[2]);
    }
  }

  if (violationIndex === null || count === null || amount === null) return null;
  if (violationIndex < 1 || violationIndex > 99) return null;
  if (count < 0 || amount < 0) return null;

  return {
    violationIndex,
    count: Math.floor(count),
    amount: Math.floor(amount),
    raw,
  };
}

export const VOICE_CHEATSHEET_AR = [
  'الخطوة 1: «خمسة» أو «مخالفة 5» أو اسم المخالفة (مثل: الإشارة الضوئية)',
  'الخطوة 2: «ثلاثة» أو «عدد 3»',
  'الخطوة 3: «200000» أو «مئتان ألف» أو «5 مليون» أو «2 مليار»',
];

export const VOICE_CHEATSHEET_EN = [
  'Step 1: say "5", "violation 5", or the violation title (e.g. traffic light)',
  'Step 2: say "3" or "count 3"',
  'Step 3: say "200000", "100 thousand", "5 million", or "2 billion"',
];
