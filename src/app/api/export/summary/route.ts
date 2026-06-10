import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { buildMainPreviewData } from '@/lib/export/mainPreview';
import { buildSummaryExportPayload } from '@/lib/export/summaryData';
import { exportSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    await requireUser(['admin', 'operator', 'viewer', 'superadmin']);
    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = await buildSummaryExportPayload(parsed.data);

    // Build report sheet rows: violation × aggregated totals across selected sectors
    const standardViolations = payload.violationRows.filter((v) => v.indexNum >= 1 && v.indexNum <= 59);
    const reportRows = standardViolations
      .map((v) => {
        let count = 0;
        let amount = 0;
        for (const sector of payload.sectorRows) {
          const data = payload.aggregated.get(`${sector.id}:${v.id}`);
          if (data) {
            count += data.count;
            amount += data.amount;
          }
        }
        return { index: v.indexNum, nameAr: v.nameAr, count, amount };
      })
      .filter((r) => r.count > 0 || r.amount > 0);

    return NextResponse.json({
      introText: payload.introText,
      footerText: payload.footerText,
      grandCount: payload.grandCount,
      grandAmount: payload.grandAmount,
      grandVehicles: payload.grandVehicles,
      grandBikes: payload.grandBikes,
      totalVehicles: payload.totalVehicles,
      totalBikes: payload.totalBikes,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      sectors: payload.sectors.map((s) => ({
        index: s.index,
        reportName: s.reportName,
        count: s.count,
        vehicles: s.vehicles,
        bikes: s.bikes,
      })),
      reportRows,
      mainSheet: buildMainPreviewData(payload),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Summary preview failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
