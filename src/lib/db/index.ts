import path from 'path';
import fs from 'fs';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

export type AppDb = LibSQLDatabase<typeof schema>;

export function isLocalSqlite(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  return !url.startsWith('libsql://') && !url.startsWith('https://');
}

export function isTursoConfigured(): boolean {
  const url = process.env.DATABASE_URL ?? '';
  return url.startsWith('libsql://') || url.startsWith('https://');
}

export function getDbPath(): string {
  const url = process.env.DATABASE_URL ?? 'file:./data/local.db';
  const filePath = url.startsWith('file:') ? url.replace('file:', '') : './data/local.db';
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  return resolved;
}

let dbInstance: AppDb | null = null;

function createLocalDb(): AppDb {
  // Loaded only for local SQLite — never on Vercel when DATABASE_URL points to Turso.
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  const { drizzle: drizzleSqlite } = require('drizzle-orm/better-sqlite3') as typeof import('drizzle-orm/better-sqlite3');
  const sqlite = new Database(getDbPath());
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return drizzleSqlite(sqlite, { schema }) as unknown as AppDb;
}

function createTursoDb(): AppDb {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. On Vercel, use a Turso libsql:// URL and TURSO_AUTH_TOKEN.');
  }
  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return drizzleLibsql(client, { schema });
}

export function getDb(): AppDb {
  if (dbInstance) return dbInstance;
  dbInstance = isLocalSqlite() ? createLocalDb() : createTursoDb();
  return dbInstance;
}

export { schema };
