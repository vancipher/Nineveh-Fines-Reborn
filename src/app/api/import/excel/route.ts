import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';
import { importExcelSummary } from '@/lib/auth/auditMessages';
import { importExcelBuffer } from '@/lib/excel/import';
import { canWriteEntries } from '@/lib/auth/roles';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!canWriteEntries(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get('file');
    const entryDate = String(form.get('entryDate') ?? '').trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Excel file is required' }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
      return NextResponse.json({ error: 'Valid entryDate (YYYY-MM-DD) is required' }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xlsm')) {
      return NextResponse.json({ error: 'Only .xlsx or .xlsm files are supported' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const result = await importExcelBuffer(bytes, entryDate, user.id);

    await auditAction(request, user, AuditEvents.IMPORT_EXCEL, {
      summary: importExcelSummary(entryDate, file.name, result.created),
      entryDate,
      fileName: file.name,
      fileSize: file.size,
      created: result.created,
      skipped: result.skipped,
      sectors: result.sectors,
    });

    if (result.created === 0 && result.errors.length > 0) {
      return NextResponse.json({ error: result.errors[0], ...result }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    const message = err instanceof Error ? err.message : 'Import failed';
    return NextResponse.json({ error: message }, { status });
  }
}
