import type { NextRequest } from 'next/server';
import { logSystemEvent, type SessionUser } from './session';

export { AuditEvents, type AuditEventType } from './auditEvents';
import type { AuditEventType } from './auditEvents';

export function requestClientMeta(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    null;
  const userAgent = request.headers.get('user-agent');
  return { ipAddress: ip, userAgent };
}

type AuditUser = Pick<SessionUser, 'id' | 'username'> | { id?: string | null; username: string };

export async function auditAction(
  request: NextRequest,
  user: AuditUser,
  eventType: AuditEventType | string,
  details?: Record<string, unknown>,
) {
  const meta = requestClientMeta(request);
  const payload = details ? { ...details } : {};
  await logSystemEvent({
    eventType,
    userId: user.id ?? null,
    username: user.username,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    details: Object.keys(payload).length > 0 ? payload : null,
  });
}
