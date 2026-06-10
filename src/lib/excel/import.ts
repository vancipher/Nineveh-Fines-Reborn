import { Buffer } from 'node:buffer';
import ExcelJS from 'exceljs';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import {
  AWZAN_AGGREGATE_VIOLATION,
  IMPOUND_COLUMNS,
  MAIN_SHEET_NAME,
  MAIN_SHEET_TOTAL_ROW,
} from '@/lib/data/catalog';
import { parseLocalizedNumber } from '@/lib/numerals';
import { isAxleWeightSector } from '@/lib/sectors';
import { newId } from '@/lib/utils';
import type { Sector, Violation } from '@/lib/db/schema';

export interface ExcelImportResult {
  created: number;
  skipped: number;
  sectors: string[];
  errors: string[];
}

function readCellNumber(cell: ExcelJS.Cell): number {
  const raw = cell.value;
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'object' && 'result' in raw) {
    const r = (raw as { result?: unknown }).result;
    if (typeof r === 'number') return r;
    if (r != null) return parseLocalizedNumber(String(r));
  }
  return parseLocalizedNumber(String(raw));
}

function findMainSheet(workbook: ExcelJS.Workbook): ExcelJS.Worksheet | undefined {
  const exact = workbook.getWorksheet(MAIN_SHEET_NAME);
  if (exact) return exact;
  return workbook.worksheets.find((ws) => ws.name.includes('59') || ws.name.includes('مخالف'));
}

async function replaceEntryLines(
  entryId: string,
  lines: Array<{ violationId: string; count: number; amount: number }>,
) {
  const db = getDb();
  await db.delete(schema.entryLines).where(eq(schema.entryLines.entryId, entryId));
  const nonZero = lines.filter((l) => l.count > 0 || l.amount > 0);
  if (nonZero.length === 0) return;
  await db.insert(schema.entryLines).values(
    nonZero.map((line) => ({
      id: newId('line'),
      entryId,
      violationId: line.violationId,
      count: line.count,
      amount: line.amount,
    })),
  );
}

export async function importExcelBuffer(
  data: ArrayBuffer | Uint8Array,
  entryDate: string,
  userId: string,
): Promise<ExcelImportResult> {
  const db = getDb();
  const workbook = new ExcelJS.Workbook();
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as Parameters<ExcelJS.Xlsx['load']>[0]);

  const sheet = findMainSheet(workbook);
  if (!sheet) {
    return { created: 0, skipped: 0, sectors: [], errors: ['Sheet "59مخالفة" not found in workbook.'] };
  }

  const sectors = await db.select().from(schema.sectors).where(eq(schema.sectors.active, true));
  const violations = await db.select().from(schema.violations).where(eq(schema.violations.active, true));

  const impoundVehicles = readCellNumber(sheet.getCell(`${IMPOUND_COLUMNS.vehicles.col}${MAIN_SHEET_TOTAL_ROW}`));
  const impoundBikes = readCellNumber(sheet.getCell(`${IMPOUND_COLUMNS.bikes.col}${MAIN_SHEET_TOTAL_ROW}`));
  let impoundsAssigned = false;

  const result: ExcelImportResult = { created: 0, skipped: 0, sectors: [], errors: [] };
  const now = new Date().toISOString();

  for (const sector of sectors) {
    if (!sector.countCol || !sector.amountCol) continue;

    const lines: Array<{ violationId: string; count: number; amount: number }> = [];

    if (isAxleWeightSector(sector)) {
      let totalCount = 0;
      let totalAmount = 0;
      for (const v of violations) {
        if (v.indexNum < 1 || v.indexNum > 59) continue;
        totalCount += readCellNumber(sheet.getCell(`${sector.countCol}${v.excelRow}`));
        totalAmount += readCellNumber(sheet.getCell(`${sector.amountCol}${v.excelRow}`));
      }
      const awzanViolation = violations.find((v) => v.indexNum === AWZAN_AGGREGATE_VIOLATION.index);
      if (awzanViolation && (totalCount > 0 || totalAmount > 0)) {
        lines.push({ violationId: awzanViolation.id, count: totalCount, amount: totalAmount });
      }
    } else {
      for (const v of violations) {
        if (v.indexNum < 1 || v.indexNum > 59) continue;
        const count = readCellNumber(sheet.getCell(`${sector.countCol}${v.excelRow}`));
        const amount = readCellNumber(sheet.getCell(`${sector.amountCol}${v.excelRow}`));
        if (count > 0 || amount > 0) {
          lines.push({ violationId: v.id, count, amount });
        }
      }
    }

    const hasImpounds = !impoundsAssigned && (impoundVehicles > 0 || impoundBikes > 0);
    if (lines.length === 0 && !hasImpounds) {
      result.skipped++;
      continue;
    }

    const entryId = newId('entry');
    await db.insert(schema.entries).values({
      id: entryId,
      sectorId: sector.id,
      entryDate,
      createdBy: userId,
      impoundVehicles: hasImpounds ? impoundVehicles : 0,
      impoundBikes: hasImpounds ? impoundBikes : 0,
      notes: 'Imported from Excel',
      createdAt: now,
      updatedAt: now,
    });

    if (hasImpounds) impoundsAssigned = true;

    await replaceEntryLines(entryId, lines);
    result.created++;
    result.sectors.push(sector.nameAr);
  }

  if (result.created === 0) {
    result.errors.push('No sector data found in the file. Check that count/amount cells are filled.');
  }

  return result;
}
