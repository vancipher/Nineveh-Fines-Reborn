import { NextRequest, NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';
import { exportExcelSummary } from '@/lib/auth/auditMessages';
import { generateExportWorkbook } from '@/lib/excel/export';
import { exportSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(['admin', 'operator', 'viewer', 'superadmin']);
    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const buffer = await generateExportWorkbook(parsed.data);

    const summary = exportExcelSummary(parsed.data.fromDate, parsed.data.toDate);
    await auditAction(request, user, AuditEvents.EXPORT_EXCEL, {
      summary,
      fromDate: parsed.data.fromDate,
      toDate: parsed.data.toDate,
      sectorCount: parsed.data.sectorIds?.length ?? 0,
      filename: `nineveh-fines_${parsed.data.fromDate}_${parsed.data.toDate}.xlsx`,
    });
    const filename = `nineveh-fines_${parsed.data.fromDate}_${parsed.data.toDate}.xlsx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const db = getDb();
  await requireUser(['admin', 'operator', 'viewer', 'superadmin']);
  const sectors = await db
    .select()
    .from(schema.sectors)
    .where(eq(schema.sectors.active, true))
    .orderBy(asc(schema.sectors.sortOrder));
  return NextResponse.json({ sectors });
}
