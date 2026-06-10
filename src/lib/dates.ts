export function dateRangePresets() {
  const today = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const startOfWeek = new Date(today);
  const day = startOfWeek.getDay();
  const diff = day === 0 ? 6 : day - 1;
  startOfWeek.setDate(startOfWeek.getDate() - diff);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    daily: { from: iso(today), to: iso(today), labelAr: 'اليوم', labelEn: 'Today' },
    weekly: { from: iso(startOfWeek), to: iso(today), labelAr: 'هذا الأسبوع', labelEn: 'This week' },
    monthly: { from: iso(startOfMonth), to: iso(today), labelAr: 'هذا الشهر', labelEn: 'This month' },
  };
}
