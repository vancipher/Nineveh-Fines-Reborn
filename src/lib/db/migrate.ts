import fs from 'fs';
import path from 'path';

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sectors (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  count_col TEXT,
  amount_col TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS violations (
  id TEXT PRIMARY KEY,
  index_num INTEGER NOT NULL,
  excel_row INTEGER NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  sector_id TEXT NOT NULL REFERENCES sectors(id),
  entry_date TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  impound_vehicles INTEGER NOT NULL DEFAULT 0,
  impound_bikes INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  violation_id TEXT NOT NULL REFERENCES violations(id),
  count INTEGER NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  attempted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_entries_sector ON entries(sector_id);
CREATE INDEX IF NOT EXISTS idx_entry_lines_entry ON entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier ON login_attempts(identifier);

CREATE TABLE IF NOT EXISTS system_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT,
  username TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_events_type ON system_events(event_type);
CREATE INDEX IF NOT EXISTS idx_system_events_created ON system_events(created_at);
CREATE INDEX IF NOT EXISTS idx_system_events_username ON system_events(username);
`;

async function migrateTurso() {
  const { createClient } = await import('@libsql/client');
  const client = createClient({
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  await client.executeMultiple(MIGRATION_SQL);
  console.log('Turso migration complete.');
}

function migrateSqlite() {
  const Database = require('better-sqlite3') as typeof import('better-sqlite3');
  const url = process.env.DATABASE_URL ?? 'file:./data/local.db';
  const filePath = url.startsWith('file:') ? url.replace('file:', '') : './data/local.db';
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const db = new Database(resolved);
  db.exec(MIGRATION_SQL);
  db.close();
  console.log('SQLite migration complete:', resolved);
}

async function main() {
  const url = process.env.DATABASE_URL ?? '';
  if (url.startsWith('libsql://') || url.startsWith('https://')) {
    await migrateTurso();
  } else {
    migrateSqlite();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
