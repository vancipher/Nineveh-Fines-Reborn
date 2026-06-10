import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';
import type { SummaryExportPayload } from '@/lib/export/summaryData';
import { toArabicNumerals } from '@/lib/numerals';

/** Column widths in DXA (twips) — total ~9000 for A4 portrait margins. */
const COL_WIDTHS = [720, 3960, 1620, 1350, 1350];

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '333333' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '333333' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '333333' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '333333' },
};

function rtlParagraph(text: string, options?: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] }) {
  return new Paragraph({
    bidirectional: true,
    alignment: options?.align ?? AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [
      new TextRun({
        text,
        bold: options?.bold,
        rightToLeft: true,
        font: 'Arial',
        size: options?.bold ? 24 : 22,
      }),
    ],
  });
}

function tableCell(
  text: string,
  widthDxa: number,
  options?: { bold?: boolean; align?: (typeof AlignmentType)[keyof typeof AlignmentType] },
) {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    borders: TABLE_BORDERS,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [rtlParagraph(text, options)],
  });
}

function buildTableRow(cells: string[], bold = false) {
  const aligns: Array<(typeof AlignmentType)[keyof typeof AlignmentType]> = [
    AlignmentType.CENTER,
    AlignmentType.RIGHT,
    AlignmentType.CENTER,
    AlignmentType.CENTER,
    AlignmentType.CENTER,
  ];
  return new TableRow({
    children: cells.map((text, i) =>
      tableCell(text, COL_WIDTHS[i] ?? 1200, { bold, align: aligns[i] }),
    ),
  });
}

export async function generateSummaryDocx(payload: SummaryExportPayload): Promise<Buffer> {
  const headerRow = buildTableRow(
    ['ت', 'اسم القاطع', 'عدد المخالفات المضبوطة', 'حجز مركبات', 'حجز دراجات'],
    true,
  );

  const dataRows = payload.sectors.map((s) =>
    buildTableRow([
      toArabicNumerals(s.index),
      s.reportName,
      s.count > 0 ? toArabicNumerals(s.count) : '—',
      s.vehicles > 0 ? toArabicNumerals(s.vehicles) : '—',
      s.bikes > 0 ? toArabicNumerals(s.bikes) : '—',
    ]),
  );

  const totalRow = buildTableRow(
    [
      '',
      'المجموع الكلي لكافة القواطع',
      toArabicNumerals(payload.grandCount),
      payload.grandVehicles > 0 ? toArabicNumerals(payload.grandVehicles) : '—',
      payload.grandBikes > 0 ? toArabicNumerals(payload.grandBikes) : '—',
    ],
    true,
  );

  const table = new Table({
    columnWidths: COL_WIDTHS,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows, totalRow],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            bidirectional: true,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: 'مديرية مرور محافظة نينوى',
                bold: true,
                underline: {},
                rightToLeft: true,
                font: 'Arial',
                size: 32,
              }),
            ],
          }),
          new Paragraph({
            bidirectional: true,
            alignment: AlignmentType.CENTER,
            spacing: { after: 280 },
            children: [
              new TextRun({
                text: payload.introText,
                rightToLeft: true,
                font: 'Arial',
                size: 22,
              }),
            ],
          }),
          table,
          new Paragraph({
            bidirectional: true,
            alignment: AlignmentType.CENTER,
            spacing: { before: 360, after: 120 },
            children: [
              new TextRun({
                text: payload.footerText,
                bold: true,
                rightToLeft: true,
                font: 'Arial',
                size: 22,
              }),
            ],
          }),
        ],
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}
