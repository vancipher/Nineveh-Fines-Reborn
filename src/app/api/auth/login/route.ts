import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  authenticateUser,
  checkLoginRateLimit,
  clearLoginAttempts,
  createSessionToken,
  logSystemEvent,
  recordFailedLoginAttempt,
  setSessionCookie,
} from '@/lib/auth/session';
import { loginSchema } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid credentials format' }, { status: 400 });
    }

    const identifier = parsed.data.login.toLowerCase();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? request.headers.get('x-real-ip') ?? null;
    const ua = request.headers.get('user-agent') ?? null;

    await checkLoginRateLimit(identifier);

    const user = await authenticateUser(parsed.data.login.trim(), parsed.data.password.trim());

    if (!user) {
      await recordFailedLoginAttempt(identifier);
      await logSystemEvent({ eventType: 'login_failed', username: identifier, ipAddress: ip, userAgent: ua });
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    await clearLoginAttempts(identifier);
    await logSystemEvent({ eventType: 'login_success', userId: user.id, username: user.username, ipAddress: ip, userAgent: ua, details: { role: user.role } });

    const token = await createSessionToken(user);
    await setSessionCookie(token);

    return NextResponse.json({ user: { username: user.username, role: user.role } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
