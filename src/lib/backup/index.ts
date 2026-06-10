import fs from 'fs';
import { getSetting, setSetting } from '@/lib/auth/session';
import { getDbPath, isLocalSqlite } from '@/lib/db';
import {
  getGoogleDriveAccessToken,
  isGoogleDriveConfigured,
  isGoogleDriveConnected,
  listDriveBackupFiles,
  uploadDatabaseToGoogleDrive,
} from '@/lib/backup/googleDrive';

function backupStamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function checkpointAndReadDb(): Buffer {
  const dbPath = getDbPath();
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  const sqlite = new Database(dbPath, { readonly: true });
  sqlite.pragma('wal_checkpoint(TRUNCATE)');
  sqlite.close();
  return fs.readFileSync(dbPath);
}

export function prepareDatabaseBackupBuffer(): { buffer: Buffer; filename: string } {
  if (!isLocalSqlite()) {
    throw new Error('Database backup is only available for local SQLite deployments.');
  }

  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) {
    throw new Error('Database file not found.');
  }

  const filename = `fines-backup_${backupStamp()}.db`;
  return { buffer: checkpointAndReadDb(), filename };
}

export async function createGoogleDriveBackup(): Promise<{ filename: string; fileId: string }> {
  if (!isGoogleDriveConfigured()) {
    throw new Error('Google Drive is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env');
  }

  if (!(await isGoogleDriveConnected())) {
    throw new Error('Connect your Google account in Admin → Settings first.');
  }

  const { buffer, filename } = prepareDatabaseBackupBuffer();
  const accessToken = await getGoogleDriveAccessToken();
  const result = await uploadDatabaseToGoogleDrive(accessToken, filename, buffer);

  const ranAt = new Date().toISOString();
  await setSetting('backup_last_run', ranAt);
  await setSetting('backup_last_file', filename);

  return { filename, fileId: result.fileId };
}

export async function listGoogleDriveBackups(): Promise<Array<{ id: string; name: string; createdTime: string }>> {
  if (!(await isGoogleDriveConnected())) return [];
  const accessToken = await getGoogleDriveAccessToken();
  return listDriveBackupFiles(accessToken);
}

export async function maybeRunScheduledBackup(): Promise<{ filename: string } | null> {
  if (!isLocalSqlite()) return null;

  const enabled = (await getSetting('backup_auto_enabled', 'false')) === 'true';
  if (!enabled) return null;

  if (!(await isGoogleDriveConnected())) return null;

  const intervalDays = Math.max(1, parseInt(await getSetting('backup_auto_interval_days', '7'), 10) || 7);
  const lastRun = await getSetting('backup_last_run', '');
  if (lastRun) {
    const elapsedMs = Date.now() - new Date(lastRun).getTime();
    if (elapsedMs < intervalDays * 24 * 60 * 60 * 1000) return null;
  }

  const result = await createGoogleDriveBackup();
  return { filename: result.filename };
}

export async function getBackupStatus() {
  const connected = await isGoogleDriveConnected();
  const email = connected ? await getSetting('google_drive_email', '') : '';
  const lastRun = await getSetting('backup_last_run', '');
  const lastFile = await getSetting('backup_last_file', '');
  const files = connected && isLocalSqlite() ? await listGoogleDriveBackups().catch(() => []) : [];

  return {
    localDb: isLocalSqlite(),
    googleConfigured: isGoogleDriveConfigured(),
    googleConnected: connected,
    googleEmail: email,
    lastRun,
    lastFile,
    files,
  };
}
