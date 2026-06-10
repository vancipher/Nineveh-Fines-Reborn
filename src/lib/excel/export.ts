import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import type { Sector, Violation } from '@/lib/db/schema';
import {
  IMPOUND_COLUMNS,
  MAIN_SHEET_DATA_COLUMN_END,
  MAIN_SHEET_DATA_COLUMN_START,
  MAIN_SHEET_GRAND_AMOUNT_COL,
  MAIN_SHEET_GRAND_COUNT_COL,
  MAIN_SHEET_NAME,
  MAIN_SHEET_TOTAL_ROW,
  SECTOR_MAIN_SHEET_HEADERS,
  mainSheetTemplateColumns,
} from '@/lib/data/catalog';
import { arabicWeekday, formatArabicDate, formatArabicPeriod } from '@/lib/export/arabicDate';
import { buildSummaryExportPayload, type ExportFilters } from '@/lib/export/summaryData';
import { toArabicNumerals } from '@/lib/numerals';
import { isAxleWeightSector } from '@/lib/sectors';

const REPORT_SHEET_NAME = 'مخالفات ومبالغ ';
const SUMMARY_SHEET_NAME = 'ملخص التصدير';
/** Report sheet grand total row (references 59مخالفة row 62). */
const REPORT_SHEET_TOTAL_ROW = 65;

export { EXCEL_SHEET_NAMES, type ExcelSheetKey } from './sheetNames';
const DATA_FIRST_ROW = 6;
const DATA_LAST_ROW = 64;

const CENTER: Partial<ExcelJS.Alignment> = {
  horizontal: 'center',
  vertical: 'middle',
  wrapText: true,
};

const GRAY_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9D9D9' },
};

function thinBorder(): Partial<ExcelJS.Borders> {
  const side = { style: 'thin' as const };
  return { top: side, left: side, bottom: side, right: side };
}

function setTextCell(cell: ExcelJS.Cell, text: string) {
  cell.value = text;
  cell.numFmt = '@';
  cell.alignment = CENTER;
}

function setNumberCell(cell: ExcelJS.Cell, value: number) {
  cell.value = toArabicNumerals(value);
  cell.numFmt = '@';
  cell.alignment = CENTER;
}

function templatePath(): string {
  const configured = process.env.TEMPLATE_XLSX;
  if (configured && fs.existsSync(configured)) return configured;

  const assetsDir = path.join(process.cwd(), 'Assets');
  if (fs.existsSync(assetsDir)) {
    const xlsx = fs.readdirSync(assetsDir).find((f) => f.endsWith('.xlsx'));
    if (xlsx) return path.join(assetsDir, xlsx);
  }

  throw new Error('Official Excel template not found. Set TEMPLATE_XLSX or place the .xlsx in /Assets.');
}

function sectorHeaderLabel(sectors: Array<{ nameAr: string }>, allSectorCount: number): string {
  if (sectors.length === 1) return ` — القاطع: ${sectors[0].nameAr}`;
  if (sectors.length >= allSectorCount) return ' — جميع القواطع';
  return ` — القواطع: ${sectors.map((s) => s.nameAr).join('، ')}`;
}

function columnLetterToIndex(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n;
}

function indexToColumnLetter(index: number): string {
  let s = '';
  let n = index;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Remove value, formula, and cached result so Excel cannot show template leftovers. */
function stripCell(cell: ExcelJS.Cell) {
  cell.value = null;
  const model = (cell as ExcelJS.Cell & { model?: { formula?: string; result?: unknown } }).model;
  if (model) {
    delete model.formula;
    delete model.result;
  }
}

function mainSheetColumnsToWipe(sheet: ExcelJS.Worksheet): string[] {
  const cols = new Set(mainSheetTemplateColumns());
  const start = columnLetterToIndex(MAIN_SHEET_DATA_COLUMN_START);
  const end = Math.max(
    columnLetterToIndex(MAIN_SHEET_DATA_COLUMN_END),
    sheet.columnCount ?? columnLetterToIndex(MAIN_SHEET_DATA_COLUMN_END),
  );
  for (let i = start; i <= end; i++) {
    cols.add(indexToColumnLetter(i));
  }
  return [...cols];
}

/**
 * Clear template sample data (row 62 SUM formulas, row 3–61 grid) without removing sector headers in rows 1–2.
 */
function wipeMainSheetDataArea(mainSheet: ExcelJS.Worksheet, violations: Violation[]) {
  const violationExcelRows = violations.map((v) => v.excelRow);
  const minRow = Math.min(...violationExcelRows, 3);
  const maxRow = Math.max(...violationExcelRows, 61);
  const cols = mainSheetColumnsToWipe(mainSheet);

  for (let rowNum = minRow; rowNum <= maxRow; rowNum++) {
    for (const col of cols) {
      stripCell(mainSheet.getCell(`${col}${rowNum}`));
    }
  }
  for (const col of cols) {
    stripCell(mainSheet.getCell(`${col}${MAIN_SHEET_TOTAL_ROW}`));
  }

  for (const violation of violations) {
    if (violation.indexNum >= 1 && violation.indexNum <= 59) {
      setTextCell(mainSheet.getCell(`A${violation.excelRow}`), toArabicNumerals(violation.indexNum));
      setTextCell(mainSheet.getCell(`B${violation.excelRow}`), violation.nameAr);
    }
  }
}

/** Restore sector column titles on rows 1–2 (template layout). */
function populateMainSheetColumnHeaders(mainSheet: ExcelJS.Worksheet, allSectors: Sector[]) {
  setTextCell(mainSheet.getCell('A1'), 'ت');
  setTextCell(mainSheet.getCell('B1'), 'نوع المخالفة');

  for (const sector of allSectors) {
    if (!sector.countCol || !sector.amountCol) continue;
    const labels = SECTOR_MAIN_SHEET_HEADERS[sector.slug];
    if (labels) {
      setTextCell(mainSheet.getCell(`${sector.countCol}1`), labels.count);
      setTextCell(mainSheet.getCell(`${sector.amountCol}1`), labels.amount);
    }
  }

  setTextCell(mainSheet.getCell(`${MAIN_SHEET_GRAND_COUNT_COL}1`), 'العدد/ الغرامات');
  setTextCell(mainSheet.getCell(`${MAIN_SHEET_GRAND_AMOUNT_COL}1`), 'مبلغ الغرامات');
  setTextCell(mainSheet.getCell(`${IMPOUND_COLUMNS.vehicles.col}1`), IMPOUND_COLUMNS.vehicles.labelAr);
  setTextCell(mainSheet.getCell(`${IMPOUND_COLUMNS.bikes.col}1`), IMPOUND_COLUMNS.bikes.labelAr);
}

function violationRowTotals(
  violation: Violation,
  sectorRows: Sector[],
  aggregated: Map<string, { count: number; amount: number }>,
) {
  let count = 0;
  let amount = 0;
  for (const sector of sectorRows) {
    if (isAxleWeightSector(sector)) continue;
    const data = aggregated.get(`${sector.id}:${violation.id}`);
    if (data) {
      count += data.count;
      amount += data.amount;
    }
  }
  return { count, amount };
}

function sumSectorAggregate(
  sector: Sector,
  violations: Violation[],
  aggregated: Map<string, { count: number; amount: number }>,
) {
  let sectorCount = 0;
  let sectorAmount = 0;
  for (const violation of violations) {
    const data = aggregated.get(`${sector.id}:${violation.id}`);
    if (data) {
      sectorCount += data.count;
      sectorAmount += data.amount;
    }
  }
  return { sectorCount, sectorAmount };
}

function populateMainSheetTotals(
  mainSheet: ExcelJS.Worksheet,
  violations: Violation[],
  sectorRows: Sector[],
  aggregated: Map<string, { count: number; amount: number }>,
  grandCount: number,
  grandAmount: number,
  totalVehicles: number,
  totalBikes: number,
) {
  setTextCell(mainSheet.getCell(`B${MAIN_SHEET_TOTAL_ROW}`), 'مجموع المخالفات المرورية');

  for (const sector of sectorRows) {
    if (!sector.countCol && !sector.amountCol) continue;

    const { sectorCount, sectorAmount } = sumSectorAggregate(sector, violations, aggregated);

    if (sector.countCol && sectorCount > 0) {
      const cell = mainSheet.getCell(`${sector.countCol}${MAIN_SHEET_TOTAL_ROW}`);
      setNumberCell(cell, sectorCount);
      cell.font = { bold: true };
    }
    if (sector.amountCol && sectorAmount > 0) {
      const cell = mainSheet.getCell(`${sector.amountCol}${MAIN_SHEET_TOTAL_ROW}`);
      setNumberCell(cell, sectorAmount);
      cell.font = { bold: true };
    }
  }

  if (grandCount > 0) {
    const yCell = mainSheet.getCell(`${MAIN_SHEET_GRAND_COUNT_COL}${MAIN_SHEET_TOTAL_ROW}`);
    setNumberCell(yCell, grandCount);
    yCell.font = { bold: true };
  }
  if (grandAmount > 0) {
    const abCell = mainSheet.getCell(`${MAIN_SHEET_GRAND_AMOUNT_COL}${MAIN_SHEET_TOTAL_ROW}`);
    setNumberCell(abCell, grandAmount);
    abCell.font = { bold: true };
  }
  if (totalVehicles > 0) {
    const cell = mainSheet.getCell(`${IMPOUND_COLUMNS.vehicles.col}${MAIN_SHEET_TOTAL_ROW}`);
    setNumberCell(cell, totalVehicles);
    cell.font = { bold: true };
  }
  if (totalBikes > 0) {
    const cell = mainSheet.getCell(`${IMPOUND_COLUMNS.bikes.col}${MAIN_SHEET_TOTAL_ROW}`);
    setNumberCell(cell, totalBikes);
    cell.font = { bold: true };
  }
}

function populateMainSheet(
  mainSheet: ExcelJS.Worksheet,
  violations: Violation[],
  sectorRows: Sector[],
  allSectors: Sector[],
  aggregated: Map<string, { count: number; amount: number }>,
  totalVehicles: number,
  totalBikes: number,
  grandCount: number,
  grandAmount: number,
) {
  mainSheet.views = [{ rightToLeft: true, activeCell: 'C3' }];
  populateMainSheetColumnHeaders(mainSheet, allSectors);
  wipeMainSheetDataArea(mainSheet, violations);

  const standardViolations = violations.filter((v) => v.indexNum >= 1 && v.indexNum <= 59);

  for (const sector of sectorRows) {
    if (!sector.countCol || !sector.amountCol || isAxleWeightSector(sector)) continue;

    for (const violation of standardViolations) {
      const data = aggregated.get(`${sector.id}:${violation.id}`);
      if (!data || (data.count === 0 && data.amount === 0)) continue;
      if (data.count > 0) {
        setNumberCell(mainSheet.getCell(`${sector.countCol}${violation.excelRow}`), data.count);
      }
      if (data.amount > 0) {
        setNumberCell(mainSheet.getCell(`${sector.amountCol}${violation.excelRow}`), data.amount);
      }
    }
  }

  for (const violation of standardViolations) {
    const { count, amount } = violationRowTotals(violation, sectorRows, aggregated);
    if (count > 0) {
      setNumberCell(mainSheet.getCell(`${MAIN_SHEET_GRAND_COUNT_COL}${violation.excelRow}`), count);
    }
    if (amount > 0) {
      setNumberCell(mainSheet.getCell(`${MAIN_SHEET_GRAND_AMOUNT_COL}${violation.excelRow}`), amount);
    }
  }

  populateMainSheetTotals(
    mainSheet,
    violations,
    sectorRows,
    aggregated,
    grandCount,
    grandAmount,
    totalVehicles,
    totalBikes,
  );
}

function populateReportSheet(
  reportSheet: ExcelJS.Worksheet,
  filters: ExportFilters,
  violations: Violation[],
  sectorRows: Sector[],
  allSectors: Sector[],
  aggregated: Map<string, { count: number; amount: number }>,
  totalVehicles: number,
  totalBikes: number,
) {
  reportSheet.views = [{ rightToLeft: true, activeCell: 'C6' }];

  const periodLabel = formatArabicPeriod(filters.fromDate, filters.toDate);
  const headerText = `موقف مديرية مرور محافظة نينوى للمخالفات (${periodLabel})${sectorHeaderLabel(sectorRows, allSectors.length)}`;

  setTextCell(reportSheet.getCell('C3'), headerText);
  setTextCell(reportSheet.getCell('D3'), arabicWeekday(filters.toDate));
  setTextCell(reportSheet.getCell('E3'), formatArabicDate(filters.toDate));

  for (let row = DATA_FIRST_ROW; row <= DATA_LAST_ROW; row++) {
    for (const col of ['B', 'C', 'D', 'E', 'F', 'G']) {
      const cell = reportSheet.getCell(`${col}${row}`);
      cell.value = col === 'B' || col === 'C' ? '' : 0;
      cell.alignment = CENTER;
      if (col === 'C') cell.numFmt = '@';
    }
  }

  let grandCount = 0;
  let grandAmount = 0;

  const standardViolations = violations.filter((v) => v.indexNum >= 1 && v.indexNum <= 59);

  for (const violation of standardViolations) {
    let vCount = 0;
    let vAmount = 0;
    for (const sector of sectorRows) {
      if (isAxleWeightSector(sector)) continue;
      const data = aggregated.get(`${sector.id}:${violation.id}`);
      if (data) {
        vCount += data.count;
        vAmount += data.amount;
      }
    }
    grandCount += vCount;
    grandAmount += vAmount;

    const row = violation.excelRow + 3;
    setNumberCell(reportSheet.getCell(`B${row}`), violation.indexNum);
    setTextCell(reportSheet.getCell(`C${row}`), violation.nameAr);
    setNumberCell(reportSheet.getCell(`D${row}`), vCount);
    setNumberCell(reportSheet.getCell(`G${row}`), vAmount);
  }

  for (const sector of sectorRows) {
    if (!isAxleWeightSector(sector)) continue;
    const { sectorCount, sectorAmount } = sumSectorAggregate(sector, violations, aggregated);
    grandCount += sectorCount;
    grandAmount += sectorAmount;
  }

  setNumberCell(reportSheet.getCell(`E${DATA_FIRST_ROW}`), totalVehicles);
  setNumberCell(reportSheet.getCell(`F${DATA_FIRST_ROW}`), totalBikes);
  if (totalVehicles > 0) {
    setNumberCell(reportSheet.getCell(`E${REPORT_SHEET_TOTAL_ROW}`), totalVehicles);
  }
  if (totalBikes > 0) {
    setNumberCell(reportSheet.getCell(`F${REPORT_SHEET_TOTAL_ROW}`), totalBikes);
  }

  for (const col of ['C', 'D', 'E', 'F', 'G']) {
    stripCell(reportSheet.getCell(`${col}${REPORT_SHEET_TOTAL_ROW}`));
  }
  setTextCell(reportSheet.getCell(`C${REPORT_SHEET_TOTAL_ROW}`), 'الإجمالي');
  setNumberCell(reportSheet.getCell(`D${REPORT_SHEET_TOTAL_ROW}`), grandCount);
  setNumberCell(reportSheet.getCell(`G${REPORT_SHEET_TOTAL_ROW}`), grandAmount);
  for (const col of ['B', 'D', 'E', 'F', 'G']) {
    reportSheet.getCell(`${col}${REPORT_SHEET_TOTAL_ROW}`).font = { bold: true };
  }
}

function removeUnwantedSheets(wb: ExcelJS.Workbook) {
  const removeNames = ['بيانات إضافية', 'Data', 'data', 'بيانات'];
  for (const name of removeNames) {
    const sheet = wb.getWorksheet(name);
    if (sheet) wb.removeWorksheet(sheet.id);
  }
}

function populateSectorSummarySheet(wb: ExcelJS.Workbook, payload: Awaited<ReturnType<typeof buildSummaryExportPayload>>) {
  const { filters, introText, footerText, sectors, grandCount, grandAmount, grandVehicles, grandBikes } = payload;
  const existing = wb.getWorksheet(SUMMARY_SHEET_NAME);
  if (existing) wb.removeWorksheet(existing.id);

  const ws = wb.addWorksheet(SUMMARY_SHEET_NAME, { views: [{ rightToLeft: true, activeCell: 'A4' }] });
  ws.columns = [{ width: 6 }, { width: 48 }, { width: 22 }, { width: 16 }, { width: 16 }];

  ws.mergeCells('A1:E1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'مديرية مرور محافظة نينوى';
  titleCell.font = { bold: true, underline: true, size: 14 };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('A2:E2');
  const introCell = ws.getCell('A2');
  introCell.value = introText;
  introCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  introCell.font = { size: 11 };
  ws.getRow(2).height = 36;

  const headerRowNum = 4;
  const headers = ['ت', 'اسم القاطع', 'عدد المخالفات المضبوطة', 'حجز مركبات', 'حجز دراجات'];
  const headerRow = ws.getRow(headerRowNum);
  headers.forEach((text, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = text;
    cell.font = { bold: true };
    cell.alignment = CENTER;
    cell.border = thinBorder();
  });
  headerRow.height = 28;

  let rowNum = headerRowNum + 1;

  sectors.forEach((sector) => {
    const row = ws.getRow(rowNum);
    const values: Array<string | number | null> = [
      sector.index,
      sector.reportName,
      sector.count || null,
      sector.vehicles || null,
      sector.bikes || null,
    ];

    values.forEach((val, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      if (colIndex === 0 && typeof val === 'number') {
        setNumberCell(cell, val);
      } else if (colIndex > 1 && typeof val === 'number') {
        setNumberCell(cell, val);
      } else {
        cell.value = val;
        if (colIndex === 1) cell.numFmt = '@';
      }
      cell.border = thinBorder();
      if (colIndex === 1) {
        cell.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      } else {
        cell.alignment = CENTER;
      }
    });
    row.height = 22;
    rowNum += 1;
  });

  const totalRow = ws.getRow(rowNum);
  const totalValues: Array<string | number | null> = [
    null,
    'المجموع الكلي لكافة القواطع',
    grandCount,
    grandVehicles || null,
    grandBikes || null,
  ];
  totalValues.forEach((val, colIndex) => {
    const cell = totalRow.getCell(colIndex + 1);
    if (colIndex === 2 && typeof val === 'number') {
      setNumberCell(cell, val);
    } else if ((colIndex === 3 || colIndex === 4) && typeof val === 'number') {
      setNumberCell(cell, val);
    } else {
      cell.value = val;
      if (colIndex === 1) cell.numFmt = '@';
    }
    cell.font = { bold: true };
    cell.border = thinBorder();
    cell.fill = GRAY_FILL;
    if (colIndex === 1) {
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    } else {
      cell.alignment = CENTER;
    }
  });
  totalRow.height = 24;
  rowNum += 2;

  ws.mergeCells(`A${rowNum}:E${rowNum}`);
  const footerCell = ws.getCell(`A${rowNum}`);
  footerCell.value = footerText;
  footerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  footerCell.font = { bold: true, size: 11 };
  ws.getRow(rowNum).height = 28;
}

export type { ExportFilters } from '@/lib/export/summaryData';

export async function generateExportWorkbook(filters: ExportFilters): Promise<Buffer> {
  const payload = await buildSummaryExportPayload(filters);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(templatePath());
  removeUnwantedSheets(wb);

  const mainSheet = wb.getWorksheet(MAIN_SHEET_NAME);
  if (!mainSheet) throw new Error(`Sheet "${MAIN_SHEET_NAME}" not found in template.`);

  const reportSheet = wb.getWorksheet(REPORT_SHEET_NAME);
  if (!reportSheet) throw new Error(`Sheet "${REPORT_SHEET_NAME}" not found in template.`);

  populateMainSheet(
    mainSheet,
    payload.violationRows,
    payload.sectorRows,
    payload.allSectors,
    payload.aggregated,
    payload.totalVehicles,
    payload.totalBikes,
    payload.grandCount,
    payload.grandAmount,
  );

  populateReportSheet(
    reportSheet,
    filters,
    payload.violationRows,
    payload.sectorRows,
    payload.allSectors,
    payload.aggregated,
    payload.totalVehicles,
    payload.totalBikes,
  );

  populateSectorSummarySheet(wb, payload);

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
