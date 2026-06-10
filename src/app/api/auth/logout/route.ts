import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionUser, logSystemEvent } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? null;
    const ua = request.headers.get('user-agent') ?? null;
    await logSystemEvent({ eventType: 'logout', userId: user.id, username: user.username, ipAddress: ip, userAgent: ua });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
