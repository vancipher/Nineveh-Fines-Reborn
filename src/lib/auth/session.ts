import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { eq, and, gte, sql } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import type { User } from '@/lib/db/schema';

const COOKIE_NAME = 'fines_session';
const MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = Pick<User, 'id' | 'email' | 'username' | 'role' | 'active'>;

export async function logSystemEvent(event: {
  eventType: string;
  userId?: string | null;
  username: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}) {
  try {
    const db = getDb();
    await db.insert(schema.systemEvents).values({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      eventType: event.eventType,
      userId: event.userId ?? null,
      username: event.username,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent?.slice(0, 300) ?? null,
      details: event.details ? JSON.stringify(event.details) : null,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Don't crash app on logging failure
  }
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set and at least 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    active: user.active,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(getSecret());
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.sub) return null;

    const db = getDb();
    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        username: schema.users.username,
        role: schema.users.role,
        active: schema.users.active,
      })
      .from(schema.users)
      .where(eq(schema.users.id, String(payload.sub)))
      .limit(1);

    if (!user || !user.active) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(roles?: Array<SessionUser['role']>) {
  const user = await getSessionUser();
  if (!user) {
    throw new AuthError('Unauthorized', 401);
  }
  if (roles && !roles.includes(user.role)) {
    // superadmin bypasses all role restrictions
    if (user.role !== 'superadmin') {
      throw new AuthError('Forbidden', 403);
    }
  }
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const LOCKOUT_THRESHOLD = 15;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;
const PROGRESSIVE_DELAY_FROM = 3;

function lockoutKey(identifier: string) {
  return `lockout_until:${identifier}`;
}

export async function checkLoginRateLimit(identifier: string) {
  const lockUntil = await getSetting(lockoutKey(identifier), '');
  if (lockUntil && Date.parse(lockUntil) > Date.now()) {
    const minutes = Math.ceil((Date.parse(lockUntil) - Date.now()) / 60000);
    throw new AuthError(
      `Account temporarily locked due to repeated failed logins. Try again in ${minutes} minute(s).`,
      429,
    );
  }

  const db = getDb();
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const attempts = await db
    .select()
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.identifier, identifier), gte(schema.loginAttempts.attemptedAt, since)));

  if (attempts.length >= LOCKOUT_THRESHOLD) {
    await setSetting(lockoutKey(identifier), new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString());
    throw new AuthError('Too many failed login attempts. Account locked for 30 minutes.', 429);
  }

  if (attempts.length >= RATE_LIMIT_MAX) {
    throw new AuthError('Too many login attempts. Try again in 15 minutes.', 429);
  }

  if (attempts.length >= PROGRESSIVE_DELAY_FROM) {
    const sorted = [...attempts].sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));
    const last = sorted[sorted.length - 1];
    const delayMs = Math.min(30_000, 1000 * 2 ** (attempts.length - PROGRESSIVE_DELAY_FROM));
    const elapsed = Date.now() - Date.parse(last.attemptedAt);
    if (elapsed < delayMs) {
      const waitSec = Math.ceil((delayMs - elapsed) / 1000);
      throw new AuthError(`Please wait ${waitSec} second(s) before trying again.`, 429);
    }
  }
}

export async function recordFailedLoginAttempt(identifier: string) {
  const db = getDb();
  await db.insert(schema.loginAttempts).values({
    id: `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    identifier,
    attemptedAt: new Date().toISOString(),
  });
}

export async function clearLoginAttempts(identifier: string) {
  const db = getDb();
  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.identifier, identifier));
  await setSetting(lockoutKey(identifier), '');
}

/** @deprecated Use recordFailedLoginAttempt — kept for compatibility */
export async function recordLoginAttempt(identifier: string) {
  return recordFailedLoginAttempt(identifier);
}

export async function authenticateUser(login: string, password: string): Promise<SessionUser | null> {
  const db = getDb();
  const loginTrimmed = login.trim();
  const loginLower = loginTrimmed.toLowerCase();

  const [byUsername] = await db
    .select()
    .from(schema.users)
    .where(sql`lower(${schema.users.username}) = ${loginLower}`)
    .limit(1);

  let found = byUsername;
  if (!found) {
    const [byEmail] = await db
      .select()
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = ${loginLower}`)
      .limit(1);
    found = byEmail;
  }

  if (!found || !found.active) return null;
  const ok = await verifyPassword(password, found.passwordHash);
  if (!ok) return null;

  return {
    id: found.id,
    email: found.email,
    username: found.username,
    role: found.role,
    active: found.active,
  };
}

export async function getSetting(key: string, fallback = '') {
  const db = getDb();
  const [row] = await db.select().from(schema.appSettings).where(eq(schema.appSettings.key, key)).limit(1);
  return row?.value ?? fallback;
}

export async function setSetting(key: string, value: string) {
  const db = getDb();
  await db
    .insert(schema.appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: schema.appSettings.key, set: { value } });
}
