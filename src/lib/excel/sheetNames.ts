/** Sheet name constants — safe to import in both server and client code. */
export const EXCEL_SHEET_NAMES = {
  main: '59مخالفة',
  report: 'مخالفات ومبالغ',
  summary: 'ملخص التصدير',
} as const;

export type ExcelSheetKey = keyof typeof EXCEL_SHEET_NAMES;
