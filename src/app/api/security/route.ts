import { NextResponse } from 'next/server';
import { desc, and, gte, count, eq } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(['superadmin']);
    const db = getDb();
    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [recentEvents, loginAttempts, allUsers, entries7d, failedEvents7d] = await Promise.all([
      db.select().from(schema.systemEvents).orderBy(desc(schema.systemEvents.createdAt)).limit(500),
      db.select().from(schema.loginAttempts).orderBy(desc(schema.loginAttempts.attemptedAt)).limit(500),
      db.select({ id: schema.users.id, username: schema.users.username, email: schema.users.email, role: schema.users.role, active: schema.users.active, createdAt: schema.users.createdAt }).from(schema.users),
      db.select({ id: schema.entries.id }).from(schema.entries).where(gte(schema.entries.createdAt, since7d)),
      db.select().from(schema.systemEvents).where(and(eq(schema.systemEvents.eventType, 'login_failed'), gte(schema.systemEvents.createdAt, since24h))),
    ]);

    // Threat analysis: group failed logins by identifier in last 7 days
    const failedByIdentifier = new Map<string, { count: number; lastAttempt: string; ips: Set<string> }>();
    for (const attempt of loginAttempts) {
      const since7dDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      if (attempt.attemptedAt < since7dDate) continue;
      const existing = failedByIdentifier.get(attempt.identifier) ?? { count: 0, lastAttempt: '', ips: new Set<string>() };
      existing.count++;
      if (!existing.lastAttempt || attempt.attemptedAt > existing.lastAttempt) existing.lastAttempt = attempt.attemptedAt;
      failedByIdentifier.set(attempt.identifier, existing);
    }

    // Also count from system_events (for IP tracking)
    const ipFailMap = new Map<string, number>();
    for (const evt of recentEvents) {
      if (evt.eventType === 'login_failed' && evt.ipAddress) {
        ipFailMap.set(evt.ipAddress, (ipFailMap.get(evt.ipAddress) ?? 0) + 1);
      }
    }

    const threats = [...failedByIdentifier.entries()]
      .map(([identifier, data]) => ({ identifier, failedCount: data.count, lastAttempt: data.lastAttempt }))
      .sort((a, b) => b.failedCount - a.failedCount)
      .slice(0, 20);

    const topIps = [...ipFailMap.entries()]
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const stats = {
      failedLogins24h: failedEvents7d.filter(e => e.createdAt >= since24h).length,
      failedLogins7d: failedByIdentifier.size > 0 ? [...failedByIdentifier.values()].reduce((a, b) => a + b.count, 0) : loginAttempts.filter(a => a.attemptedAt >= since7d).length,
      totalEvents7d: recentEvents.filter(e => e.createdAt >= since7d).length,
      activeUsers: allUsers.filter(u => u.active).length,
      totalUsers: allUsers.length,
      entries7d: entries7d.length,
      topIps,
    };

    await auditAction(request, user, AuditEvents.SECURITY_VIEW);

    const eventTypeCounts: Record<string, number> = {};
    for (const evt of recentEvents) {
      if (evt.createdAt >= since7d) {
        eventTypeCounts[evt.eventType] = (eventTypeCounts[evt.eventType] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      recentEvents: recentEvents.slice(0, 200),
      loginAttempts: loginAttempts.slice(0, 200),
      users: allUsers,
      threats,
      stats: { ...stats, eventTypeCounts },
    });
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}
