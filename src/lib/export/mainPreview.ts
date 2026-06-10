import type { MainPreviewData } from '@/components/MainPreviewTable';
import { SECTOR_REPORT_NAMES } from '@/lib/data/catalog';
import { formatArabicDate, formatArabicPeriod } from '@/lib/export/arabicDate';
import type { SummaryExportPayload } from '@/lib/export/summaryData';
import { sectorAggregateTotals } from '@/lib/export/summaryData';

/** Build HTML preview payload for 59مخالفة sheet PNG export. */
export function buildMainPreviewData(payload: SummaryExportPayload): MainPreviewData {
  const sectorColumns = payload.sectorRows.map((s) => ({
    id: s.id,
    label: SECTOR_REPORT_NAMES[s.slug] ?? s.nameAr,
  }));

  const rows = payload.violationRows
    .map((v) => {
      const counts: (number | null)[] = [];
      const amounts: (number | null)[] = [];
      let hasData = false;
      for (const sector of payload.sectorRows) {
        const data = payload.aggregated.get(`${sector.id}:${v.id}`);
        const c = data?.count ?? 0;
        const a = data?.amount ?? 0;
        counts.push(c > 0 ? c : null);
        amounts.push(a > 0 ? a : null);
        if (c > 0 || a > 0) hasData = true;
      }
      return {
        index: v.indexNum,
        nameAr: v.nameAr,
        counts,
        amounts,
        hasData,
      };
    })
    .filter((r) => r.hasData);

  const sectorTotals = payload.sectorRows.map((sector) =>
    sectorAggregateTotals(sector, payload.violationRows, payload.aggregated),
  );

  const period =
    payload.fromDate === payload.toDate
      ? `يوم ${formatArabicDate(payload.toDate)}`
      : `الفترة ${formatArabicPeriod(payload.fromDate, payload.toDate)}`;

  return {
    title: 'مديرية مرور محافظة نينوى',
    subtitle: `جدول المخالفات (${period})`,
    reportDate: formatArabicPeriod(payload.fromDate, payload.toDate),
    sectorColumns,
    rows,
    sectorTotals,
    impoundVehicles: payload.totalVehicles,
    impoundBikes: payload.totalBikes,
  };
}
