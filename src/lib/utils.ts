export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function slugFromSectorName(nameEn: string, nameAr: string): string {
  const fromEn = nameEn
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (fromEn.length >= 2) return fromEn.slice(0, 40);

  const fromAr = nameAr
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\u0600-\u06FFa-z0-9_-]/gi, '')
    .slice(0, 40);

  return fromAr.length >= 2 ? fromAr : `sector_${Date.now().toString(36)}`;
}
