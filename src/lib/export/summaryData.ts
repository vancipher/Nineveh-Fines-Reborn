import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import type { Entry, Sector, Violation } from '@/lib/db/schema';
import { SECTOR_REPORT_NAMES } from '@/lib/data/catalog';
import { formatArabicDate } from '@/lib/export/arabicDate';
import { formatDeferredFinesFooter } from '@/lib/excel/arabicAmount';
import { isAxleWeightSector } from '@/lib/sectors';

export interface ExportFilters {
  fromDate: string;
  toDate: string;
  sectorIds: string[];
}

export interface SummarySectorRow {
  index: number;
  nameAr: string;
  nameEn: string;
  reportName: string;
  count: number;
  amount: number;
  vehicles: number;
  bikes: number;
  isAxleWeight: boolean;
}

export interface SummaryExportPayload {
  filters: ExportFilters;
  fromDate: string;
  toDate: string;
  introText: string;
  footerText: string;
  sectors: SummarySectorRow[];
  grandCount: number;
  grandAmount: number;
  grandVehicles: number;
  grandBikes: number;
  violationRows: Violation[];
  sectorRows: Sector[];
  allSectors: Sector[];
  aggregated: Map<string, { count: number; amount: number }>;
  sectorImpounds: Map<string, { vehicles: number; bikes: number }>;
  totalVehicles: number;
  totalBikes: number;
  entryRows: Entry[];
}

function periodIntroText(fromDate: string, toDate: string): string {
  if (fromDate === toDate) {
    return `ادناه نشاطات القواطع المرورية العاملة في مديرية مرور محافظة نينوى ليوم ${formatArabicDate(toDate)} مقسمة حسب القواطع مع المجموع الكلي`;
  }
  return `ادناه نشاطات القواطع المرورية العاملة في مديرية مرور محافظة نينوى للفترة من ${formatArabicDate(fromDate)} إلى ${formatArabicDate(toDate)} مقسمة حسب القواطع مع المجموع الكلي`;
}

function sectorTotals(
  sector: Sector,
  violations: Violation[],
  aggregated: Map<string, { count: number; amount: number }>,
  sectorImpounds: Map<string, { vehicles: number; bikes: number }>,
) {
  if (isAxleWeightSector(sector)) {
    let count = 0;
    let amount = 0;
    for (const violation of violations) {
      const data = aggregated.get(`${sector.id}:${violation.id}`);
      if (data) {
        count += data.count;
        amount += data.amount;
      }
    }
    const impound = sectorImpounds.get(sector.id) ?? { vehicles: 0, bikes: 0 };
    return { count, amount, vehicles: impound.vehicles, bikes: impound.bikes };
  }

  let count = 0;
  let amount = 0;
  for (const violation of violations) {
    const data = aggregated.get(`${sector.id}:${violation.id}`);
    if (data) {
      count += data.count;
      amount += data.amount;
    }
  }
  const impound = sectorImpounds.get(sector.id) ?? { vehicles: 0, bikes: 0 };
  return { count, amount, vehicles: impound.vehicles, bikes: impound.bikes };
}

/** Aggregate sector × violation totals for a date range (shared by Excel, Word, preview). */
export function sectorAggregateTotals(
  sector: Sector,
  violations: Violation[],
  aggregated: Map<string, { count: number; amount: number }>,
): { count: number; amount: number } {
  const t = sectorTotals(sector, violations, aggregated, new Map());
  return { count: t.count, amount: t.amount };
}

export async function buildSummaryExportPayload(filters: ExportFilters): Promise<SummaryExportPayload> {
  const db = getDb();

  const allSectors = await db
    .select()
    .from(schema.sectors)
    .where(eq(schema.sectors.active, true))
    .orderBy(asc(schema.sectors.sortOrder));

  const sectorRows = allSectors.filter((s) => filters.sectorIds.includes(s.id));

  const violationRows = await db
    .select()
    .from(schema.violations)
    .where(eq(schema.violations.active, true))
    .orderBy(asc(schema.violations.sortOrder));

  const standardViolations = violationRows.filter((v) => v.indexNum >= 1 && v.indexNum <= 59);

  const entryRows = await db
    .select()
    .from(schema.entries)
    .where(
      and(
        gte(schema.entries.entryDate, filters.fromDate),
        lte(schema.entries.entryDate, filters.toDate),
        inArray(schema.entries.sectorId, filters.sectorIds),
      ),
    );

  const entryIds = entryRows.map((e) => e.id);
  const lineRows =
    entryIds.length === 0
      ? []
      : await db.select().from(schema.entryLines).where(inArray(schema.entryLines.entryId, entryIds));

  const aggregated = new Map<string, { count: number; amount: number }>();
  const sectorImpounds = new Map<string, { vehicles: number; bikes: number }>();
  let totalVehicles = 0;
  let totalBikes = 0;

  for (const entry of entryRows) {
    totalVehicles += entry.impoundVehicles;
    totalBikes += entry.impoundBikes;
    const prevImpound = sectorImpounds.get(entry.sectorId) ?? { vehicles: 0, bikes: 0 };
    prevImpound.vehicles += entry.impoundVehicles;
    prevImpound.bikes += entry.impoundBikes;
    sectorImpounds.set(entry.sectorId, prevImpound);
  }

  for (const line of lineRows) {
    const entry = entryRows.find((e) => e.id === line.entryId);
    if (!entry) continue;
    const key = `${entry.sectorId}:${line.violationId}`;
    const prev = aggregated.get(key) ?? { count: 0, amount: 0 };
    prev.count += line.count;
    prev.amount += line.amount;
    aggregated.set(key, prev);
  }

  const sortedSectors = [...sectorRows].sort((a, b) => a.sortOrder - b.sortOrder);
  let grandCount = 0;
  let grandAmount = 0;
  let grandVehicles = 0;
  let grandBikes = 0;

  const sectors: SummarySectorRow[] = sortedSectors.map((sector, index) => {
    const totals = sectorTotals(sector, violationRows, aggregated, sectorImpounds);
    grandCount += totals.count;
    grandAmount += totals.amount;
    grandVehicles += totals.vehicles;
    grandBikes += totals.bikes;
    return {
      index: index + 1,
      nameAr: sector.nameAr,
      nameEn: sector.nameEn,
      reportName: SECTOR_REPORT_NAMES[sector.slug] ?? sector.nameAr,
      count: totals.count,
      amount: totals.amount,
      vehicles: totals.vehicles,
      bikes: totals.bikes,
      isAxleWeight: isAxleWeightSector(sector),
    };
  });

  return {
    filters,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    introText: periodIntroText(filters.fromDate, filters.toDate),
    footerText: formatDeferredFinesFooter(grandAmount),
    sectors,
    grandCount,
    grandAmount,
    grandVehicles,
    grandBikes,
    violationRows: standardViolations,
    sectorRows,
    allSectors,
    aggregated,
    sectorImpounds,
    totalVehicles,
    totalBikes,
    entryRows,
  };
}
