import { generateSummaryDocx } from '../src/lib/export/summaryDocx';
import type { SummaryExportPayload } from '../src/lib/export/summaryData';

const payload = {
  sectors: [
    {
      index: 1,
      reportName: 'قاطع تجريبي',
      nameAr: 'قاطع تجريبي',
      nameEn: 'Test',
      count: 5,
      amount: 0,
      vehicles: 2,
      bikes: 1,
      isAxleWeight: false,
    },
  ],
  grandCount: 5,
  grandVehicles: 2,
  grandBikes: 1,
} as SummaryExportPayload;

async function main() {
  const buf = await generateSummaryDocx(payload);
  if (buf.length < 1000) throw new Error('DOCX too small');
  if (buf[0] !== 0x50 || buf[1] !== 0x4b) throw new Error('Not a ZIP/docx file');
  console.log('DOCX_OK', buf.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
