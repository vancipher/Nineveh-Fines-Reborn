import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { requireUser } from '@/lib/auth/session';
import { buildGoogleAuthUrl, getGoogleConfigError, isGoogleDriveConfigured } from '@/lib/backup/googleDrive';

export async function GET() {
  try {
    await requireUser(['admin']);

    const configError = getGoogleConfigError();
    if (configError) {
      return NextResponse.json({ error: configError, setupRequired: true }, { status: 400 });
    }

    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });

    return NextResponse.json({ url: buildGoogleAuthUrl(state) });
  } catch (err) {
    const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500;
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status });
  }
}
