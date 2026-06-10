import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';
import {
  createGoogleDriveBackup,
  getBackupStatus,
  maybeRunScheduledBackup,
} from '@/lib/backup';
import { disconnectGoogleDrive } from '@/lib/backup/googleDrive';

export async function GET() {
  try {
    await requireUser(['admin']);
    await maybeRunScheduledBackup().catch(() => null);
    return NextResponse.json(await getBackupStatus());
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(['admin', 'superadmin']);
    const result = await createGoogleDriveBackup();
    await auditAction(request, user, AuditEvents.BACKUP_CREATED, { fileId: result.fileId, filename: result.filename });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(['admin', 'superadmin']);
    await disconnectGoogleDrive();
    await auditAction(request, user, AuditEvents.BACKUP_DISCONNECTED);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}

export async function PUT() {
  try {
    await requireUser(['admin']);
    const result = await maybeRunScheduledBackup();
    return NextResponse.json({ ok: true, ran: Boolean(result), filename: result?.filename ?? null });
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}
