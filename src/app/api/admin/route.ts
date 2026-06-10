import { NextRequest, NextResponse } from 'next/server';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { hashPassword, requireUser, getSetting, setSetting } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';
import {
  adminUserCreatedSummary,
  adminUserDeletedSummary,
  adminUserUpdatedSummary,
} from '@/lib/auth/auditMessages';

const SUPERADMIN_USERNAME = 'AbdullahYasir';
import { sectorSchema, userSchema, violationSchema, settingsSchema } from '@/lib/validators';
import { newId, slugFromSectorName } from '@/lib/utils';
import { maybeRunScheduledBackup } from '@/lib/backup';
import { isGoogleDriveConfigured, isGoogleDriveConnected } from '@/lib/backup/googleDrive';

async function loadSettings() {
  const [
    voiceLanguage,
    uiLanguage,
    defaultTheme,
    systemName,
    backupAutoEnabled,
    backupAutoIntervalDays,
    backupLastRun,
    backupLastFile,
    googleDriveEmail,
  ] = await Promise.all([
    getSetting('voice_language', 'ar-IQ'),
    getSetting('ui_language', 'ar'),
    getSetting('default_theme', 'light'),
    getSetting('system_name', 'نظام مخالفات مرور نينوى'),
    getSetting('backup_auto_enabled', 'false'),
    getSetting('backup_auto_interval_days', '7'),
    getSetting('backup_last_run', ''),
    getSetting('backup_last_file', ''),
    getSetting('google_drive_email', ''),
  ]);

  const googleConnected = await isGoogleDriveConnected();
  const db = getDb();
  const failedLoginAttempts = await db
    .select()
    .from(schema.loginAttempts)
    .orderBy(desc(schema.loginAttempts.attemptedAt))
    .limit(50);

  return {
    voiceLanguage,
    uiLanguage,
    defaultTheme,
    systemName,
    backupAutoEnabled: backupAutoEnabled === 'true',
    backupAutoIntervalDays: parseInt(backupAutoIntervalDays, 10) || 7,
    backupLastRun,
    backupLastFile,
    googleConfigured: isGoogleDriveConfigured(),
    googleConnected,
    googleDriveEmail: googleConnected ? googleDriveEmail : '',
    failedLoginAttempts,
  };
}

export async function GET(request: NextRequest) {
  try {
    await requireUser(['admin']);
    const resource = request.nextUrl.searchParams.get('resource');
    const db = getDb();

    if (resource === 'sectors') {
      const rows = await db.select().from(schema.sectors).orderBy(asc(schema.sectors.sortOrder));
      return NextResponse.json({ rows });
    }
    if (resource === 'violations') {
      const rows = await db.select().from(schema.violations).orderBy(asc(schema.violations.sortOrder));
      return NextResponse.json({ rows });
    }
    if (resource === 'users') {
      const all = await db.select().from(schema.users);
      const rows = all.map(({ passwordHash: _, ...rest }) => rest);
      return NextResponse.json({ rows });
    }
    if (resource === 'settings') {
      await maybeRunScheduledBackup().catch(() => null);
      return NextResponse.json(await loadSettings());
    }

    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireUser(['admin']);
    const body = await request.json();
    const db = getDb();

    if (body.resource === 'sector') {
      const parsed = sectorSchema.safeParse(body.data);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

      let slug = parsed.data.slug ?? slugFromSectorName(parsed.data.nameEn, parsed.data.nameAr);
      const [existingSlug] = await db.select().from(schema.sectors).where(eq(schema.sectors.slug, slug)).limit(1);
      if (existingSlug) slug = `${slug}_${Date.now().toString(36).slice(-4)}`;

      let sortOrder = parsed.data.sortOrder;
      if (sortOrder === undefined) {
        const existing = await db.select({ sortOrder: schema.sectors.sortOrder }).from(schema.sectors);
        sortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder), 0) + 1;
      }

      const id = body.id ?? newId('sector');
      await db.insert(schema.sectors).values({
        id,
        slug,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        countCol: parsed.data.countCol ?? null,
        amountCol: parsed.data.amountCol ?? null,
        sortOrder,
        active: parsed.data.active,
      });
      return NextResponse.json({ id });
    }

    if (body.resource === 'violation') {
      const parsed = violationSchema.safeParse(body.data);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      const id = body.id ?? newId('violation');
      await db.insert(schema.violations).values({
        id,
        indexNum: parsed.data.indexNum,
        excelRow: parsed.data.excelRow ?? parsed.data.indexNum + 2,
        nameAr: parsed.data.nameAr,
        nameEn: parsed.data.nameEn,
        sortOrder: parsed.data.sortOrder || parsed.data.indexNum,
        active: parsed.data.active,
      });
      return NextResponse.json({ id });
    }

    if (body.resource === 'user') {
      const parsed = userSchema.safeParse(body.data);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      if (!parsed.data.password) {
        return NextResponse.json({ error: 'Password required for new user' }, { status: 400 });
      }
      if (parsed.data.role === 'superadmin') {
        const caller = await requireUser();
        if (caller.role !== 'superadmin') {
          return NextResponse.json({ error: 'Only superadmin can create another superadmin.' }, { status: 403 });
        }
      }
      const id = newId('user');
      await db.insert(schema.users).values({
        id,
        email: parsed.data.email,
        username: parsed.data.username,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        active: parsed.data.active,
        createdAt: new Date().toISOString(),
      });
      const caller = await requireUser();
      await auditAction(request, caller, AuditEvents.ADMIN_ACTION, {
        action: 'user_created',
        target: parsed.data.username,
        role: parsed.data.role,
        summary: adminUserCreatedSummary(parsed.data.username, parsed.data.role),
      });
      return NextResponse.json({ id });
    }

    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireUser(['admin']);
    const body = await request.json();
    const db = getDb();

    if (body.resource === 'sector') {
      const parsed = sectorSchema.partial().safeParse(body.data);
      if (!parsed.success || !body.id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
      await db.update(schema.sectors).set(parsed.data).where(eq(schema.sectors.id, body.id));
      return NextResponse.json({ ok: true });
    }

    if (body.resource === 'violation') {
      const parsed = violationSchema.partial().safeParse(body.data);
      if (!parsed.success || !body.id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
      await db.update(schema.violations).set(parsed.data).where(eq(schema.violations.id, body.id));
      return NextResponse.json({ ok: true });
    }

    if (body.resource === 'user') {
      const parsed = userSchema.partial().safeParse(body.data);
      if (!parsed.success || !body.id) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

      // Protect superadmin: only superadmin can modify superadmin accounts
      const [targetUser] = await db.select().from(schema.users).where(eq(schema.users.id, body.id)).limit(1);
      if (targetUser?.username === SUPERADMIN_USERNAME || targetUser?.role === 'superadmin') {
        const caller = await requireUser();
        if (caller.role !== 'superadmin') {
          return NextResponse.json({ error: 'Cannot modify the superadmin account.' }, { status: 403 });
        }
      }

      const update: Record<string, unknown> = { ...parsed.data };
      delete update.password;
      if (parsed.data.password) {
        update.passwordHash = await hashPassword(parsed.data.password);
      }
      await db.update(schema.users).set(update).where(eq(schema.users.id, body.id));
      const caller = await requireUser();
      const changes: string[] = [];
      if (parsed.data.role !== undefined) changes.push(`role → ${parsed.data.role}`);
      if (parsed.data.active !== undefined) changes.push(parsed.data.active ? 'activated' : 'deactivated');
      if (parsed.data.password) changes.push('password reset');
      if (parsed.data.email) changes.push('email updated');
      if (parsed.data.username) changes.push('username updated');
      if (changes.length > 0) {
        await auditAction(request, caller, AuditEvents.ADMIN_ACTION, {
          action: 'user_updated',
          target: targetUser?.username ?? body.id,
          changes,
          summary: adminUserUpdatedSummary(targetUser?.username ?? body.id, changes),
        });
      }
      return NextResponse.json({ ok: true });
    }

    if (body.resource === 'settings') {
      const parsed = settingsSchema.safeParse(body.data);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

      const tasks: Promise<void>[] = [];
      if (parsed.data.voiceLanguage !== undefined) {
        tasks.push(setSetting('voice_language', parsed.data.voiceLanguage));
      }
      if (parsed.data.uiLanguage !== undefined) {
        tasks.push(setSetting('ui_language', parsed.data.uiLanguage));
      }
      if (parsed.data.defaultTheme !== undefined) {
        tasks.push(setSetting('default_theme', parsed.data.defaultTheme));
      }
      if (parsed.data.systemName !== undefined) {
        tasks.push(setSetting('system_name', parsed.data.systemName));
      }
      if (parsed.data.backupAutoEnabled !== undefined) {
        tasks.push(setSetting('backup_auto_enabled', parsed.data.backupAutoEnabled ? 'true' : 'false'));
      }
      if (parsed.data.backupAutoIntervalDays !== undefined) {
        tasks.push(setSetting('backup_auto_interval_days', String(parsed.data.backupAutoIntervalDays)));
      }
      await Promise.all(tasks);

      return NextResponse.json({ ok: true, ...(await loadSettings()) });
    }

    return NextResponse.json({ error: 'Unknown resource' }, { status: 400 });
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const caller = await requireUser(['admin', 'superadmin']);
    const resource = request.nextUrl.searchParams.get('resource');
    const id = request.nextUrl.searchParams.get('id');
    if (resource !== 'user' || !id) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const db = getDb();
    const [targetUser] = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.username === SUPERADMIN_USERNAME || targetUser.role === 'superadmin') {
      return NextResponse.json({ error: 'Cannot delete the superadmin account.' }, { status: 403 });
    }

    if (targetUser.id === caller.id) {
      return NextResponse.json({ error: 'Cannot delete your own account.' }, { status: 403 });
    }

    await db.update(schema.entries).set({ createdBy: caller.id }).where(eq(schema.entries.createdBy, id));
    await db.delete(schema.users).where(eq(schema.users.id, id));

    await auditAction(request, caller, AuditEvents.ADMIN_ACTION, {
      action: 'user_deleted',
      target: targetUser.username,
      summary: adminUserDeletedSummary(targetUser.username),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}
