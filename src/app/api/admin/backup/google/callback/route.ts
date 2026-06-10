import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { exchangeGoogleAuthCode, getAdminPageUrl } from '@/lib/backup/googleDrive';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const oauthError = url.searchParams.get('error');

  if (oauthError) {
    const description = url.searchParams.get('error_description');
    return NextResponse.redirect(
      getAdminPageUrl({
        backup: 'error',
        msg: oauthError,
        ...(description ? { detail: description.slice(0, 200) } : {}),
      }),
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(getAdminPageUrl({ backup: 'error', msg: 'missing_code' }));
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;
  cookieStore.delete('google_oauth_state');

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(getAdminPageUrl({ backup: 'error', msg: 'invalid_state' }));
  }

  try {
    await exchangeGoogleAuthCode(code);
    return NextResponse.redirect(getAdminPageUrl({ backup: 'connected' }));
  } catch (err) {
    return NextResponse.redirect(
      getAdminPageUrl({
        backup: 'error',
        msg: err instanceof Error ? err.message : 'auth_failed',
      }),
    );
  }
}
