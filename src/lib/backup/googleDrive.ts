import { getSetting, setSetting } from '@/lib/auth/session';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const BACKUP_FOLDER_NAME = 'Nineveh Fines Backups';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ');

const PLACEHOLDER_IDS = new Set(['your-client-id', 'your_client_id', 'xxx', '']);
const PLACEHOLDER_SECRETS = new Set(['your-client-secret', 'your_client_secret', 'xxx', '']);

function getClientId() {
  return (process.env.GOOGLE_CLIENT_ID ?? '').trim();
}

function getClientSecret() {
  return (process.env.GOOGLE_CLIENT_SECRET ?? '').trim();
}

export function getGoogleConfigError(): string | null {
  const id = getClientId();
  const secret = getClientSecret();

  if (!id || !secret) {
    return 'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.';
  }
  if (PLACEHOLDER_IDS.has(id.toLowerCase()) || PLACEHOLDER_SECRETS.has(secret.toLowerCase())) {
    return 'Replace the placeholder values in .env with real credentials from Google Cloud Console.';
  }
  if (!id.endsWith('.apps.googleusercontent.com')) {
    return 'GOOGLE_CLIENT_ID must be the full Client ID from Google Cloud (ends with .apps.googleusercontent.com).';
  }
  if (secret.length < 20) {
    return 'GOOGLE_CLIENT_SECRET looks invalid. Copy the full secret from Google Cloud Console.';
  }
  return null;
}

export function isGoogleDriveConfigured(): boolean {
  return getGoogleConfigError() === null;
}

export function getGoogleRedirectUri(): string {
  if (process.env.GOOGLE_REDIRECT_URI) return process.env.GOOGLE_REDIRECT_URI;
  return `${getAppBaseUrl()}/api/admin/backup/google/callback`;
}

const INVALID_HOSTS = new Set(['0.0.0.0', '[::]', '::', '127.0.0.1']);

export function getAppBaseUrl(): string {
  if (process.env.APP_URL) {
    const configured = process.env.APP_URL.replace(/\/$/, '');
    try {
      const host = new URL(configured).hostname;
      if (!INVALID_HOSTS.has(host)) return configured;
    } catch {
      /* fall through */
    }
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://localhost:3000';
}

/** After OAuth, redirect here — never use 0.0.0.0 (invalid in browsers). */
export function getAdminPageUrl(searchParams?: Record<string, string>): string {
  const url = new URL('/admin', getAppBaseUrl());
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getGoogleRedirectUri(),
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  const token = await getSetting('google_drive_refresh_token', '');
  return token.length > 0;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? 'Failed to refresh Google access token');
  }
  return data.access_token;
}

export async function getGoogleDriveAccessToken(): Promise<string> {
  const refreshToken = await getSetting('google_drive_refresh_token', '');
  if (!refreshToken) {
    throw new Error('Google Drive is not connected.');
  }
  return refreshAccessToken(refreshToken);
}

export async function exchangeGoogleAuthCode(code: string): Promise<{ email: string }> {
  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = (await tokenRes.json()) as {
    refresh_token?: string;
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenRes.ok || !tokenData.refresh_token || !tokenData.access_token) {
    throw new Error(tokenData.error_description ?? tokenData.error ?? 'Google authorization failed');
  }

  const userRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = (await userRes.json()) as { email?: string };
  const email = userData.email ?? '';

  await setSetting('google_drive_refresh_token', tokenData.refresh_token);
  await setSetting('google_drive_email', email);
  await setSetting('google_drive_folder_id', '');

  return { email };
}

export async function disconnectGoogleDrive(): Promise<void> {
  await setSetting('google_drive_refresh_token', '');
  await setSetting('google_drive_email', '');
  await setSetting('google_drive_folder_id', '');
}

async function ensureBackupFolder(accessToken: string): Promise<string> {
  const savedFolderId = await getSetting('google_drive_folder_id', '');
  if (savedFolderId) return savedFolderId;

  const query = encodeURIComponent(
    `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const searchRes = await fetch(`${DRIVE_FILES_URL}?q=${query}&fields=files(id,name)&pageSize=1`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchData = (await searchRes.json()) as { files?: Array<{ id: string }> };
  if (searchData.files?.[0]?.id) {
    await setSetting('google_drive_folder_id', searchData.files[0].id);
    return searchData.files[0].id;
  }

  const createRes = await fetch(`${DRIVE_FILES_URL}?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: BACKUP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const createData = (await createRes.json()) as { id?: string; error?: { message?: string } };
  if (!createRes.ok || !createData.id) {
    throw new Error(createData.error?.message ?? 'Failed to create Google Drive backup folder');
  }

  await setSetting('google_drive_folder_id', createData.id);
  return createData.id;
}

export async function uploadDatabaseToGoogleDrive(
  accessToken: string,
  filename: string,
  buffer: Buffer,
): Promise<{ fileId: string }> {
  const folderId = await ensureBackupFolder(accessToken);
  const boundary = `fines_backup_${Date.now()}`;
  const metadata = JSON.stringify({
    name: filename,
    parents: [folderId],
    mimeType: 'application/x-sqlite3',
  });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/x-sqlite3\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const uploadRes = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  const uploadData = (await uploadRes.json()) as { id?: string; error?: { message?: string } };
  if (!uploadRes.ok || !uploadData.id) {
    throw new Error(uploadData.error?.message ?? 'Failed to upload backup to Google Drive');
  }

  return { fileId: uploadData.id };
}

export async function listDriveBackupFiles(
  accessToken: string,
): Promise<Array<{ id: string; name: string; createdTime: string }>> {
  const folderId = await getSetting('google_drive_folder_id', '');
  if (!folderId) return [];

  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const res = await fetch(
    `${DRIVE_FILES_URL}?q=${query}&fields=files(id,name,createdTime)&orderBy=createdTime desc&pageSize=20`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  const data = (await res.json()) as {
    files?: Array<{ id: string; name: string; createdTime: string }>;
  };
  return data.files ?? [];
}
