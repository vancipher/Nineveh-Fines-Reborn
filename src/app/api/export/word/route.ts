import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';
import { exportWordSummary } from '@/lib/auth/auditMessages';
import { buildSummaryExportPayload } from '@/lib/export/summaryData';
import { generateSummaryDocx } from '@/lib/export/summaryDocx';
import { exportSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(['admin', 'operator', 'viewer', 'superadmin']);
    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const payload = await buildSummaryExportPayload(parsed.data);

    await auditAction(request, user, AuditEvents.EXPORT_WORD, {
      summary: exportWordSummary(parsed.data.fromDate, parsed.data.toDate),
      fromDate: parsed.data.fromDate,
      toDate: parsed.data.toDate,
      sectorCount: parsed.data.sectorIds?.length ?? 0,
    });
    const buffer = await generateSummaryDocx(payload);
    const filename = `nineveh-summary_${parsed.data.fromDate}_${parsed.data.toDate}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Word export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
