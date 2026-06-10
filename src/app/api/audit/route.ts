import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSessionUser } from '@/lib/auth/session';
import { auditAction, AuditEvents } from '@/lib/auth/audit';
import { pageViewSummary } from '@/lib/auth/auditMessages';

const bodySchema = z.union([
  z.object({
    path: z.string().min(1).max(200),
  }),
  z.object({
    eventType: z.string().min(1).max(64),
    summary: z.string().min(1).max(500),
    details: z.record(z.unknown()).optional(),
  }),
]);

/** Client-side audit: page views and client-only actions (PNG export, etc.) */
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid audit payload' }, { status: 400 });
  }

  const body = parsed.data;

  if ('path' in body) {
    const summary = pageViewSummary(body.path);
    await auditAction(request, user, AuditEvents.PAGE_VIEW, { path: body.path, summary });
    return NextResponse.json({ ok: true });
  }

  await auditAction(request, user, body.eventType, {
    ...body.details,
    summary: body.summary,
  });

  return NextResponse.json({ ok: true });
}
