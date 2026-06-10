/**
 * One-time setup script: creates the AbdullahYasir superadmin account if it doesn't exist.
 *
 * Usage (run from project root with .env loaded):
 *   npx tsx scripts/ensure-superadmin.ts
 *
 * Or via npm script:
 *   npm run setup:superadmin
 */

import bcrypt from 'bcryptjs';

const SUPERADMIN_USERNAME = 'AbdullahYasir';
const SUPERADMIN_EMAIL = 'superadmin@fines-system.local';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'AbdullahYasir@Fines2026!';

async function ensureSuperadmin() {
  const url = process.env.DATABASE_URL ?? '';
  const isTurso = url.startsWith('libsql://') || url.startsWith('https://');

  console.log(`Connecting to ${isTurso ? 'Turso (remote)' : 'local SQLite'} database…`);

  const id = 'user_superadmin_abdullahyasir';
  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
  const now = new Date().toISOString();

  if (isTurso) {
    const { createClient } = await import('@libsql/client');
    const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

    const { rows } = await client.execute({ sql: 'SELECT id FROM users WHERE username = ?', args: [SUPERADMIN_USERNAME] });
    if (rows.length > 0) {
      const hash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
      await client.execute({
        sql: `UPDATE users SET password_hash = ?, role = 'superadmin', active = 1 WHERE lower(username) = lower(?)`,
        args: [hash, SUPERADMIN_USERNAME],
      });
      console.log(`✓ Superadmin '${SUPERADMIN_USERNAME}' updated (password + role refreshed).`);
      return;
    }

    await client.execute({
      sql: `INSERT INTO users (id, email, username, password_hash, role, active, created_at)
            VALUES (?, ?, ?, ?, 'superadmin', 1, ?)`,
      args: [id, SUPERADMIN_EMAIL, SUPERADMIN_USERNAME, passwordHash, now],
    });
    console.log(`✓ Superadmin '${SUPERADMIN_USERNAME}' created successfully.`);
  } else {
    const Database = require('better-sqlite3');
    const path = require('path');
    const fs = require('fs');
    const filePath = url.startsWith('file:') ? url.replace('file:', '') : './data/local.db';
    const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    const db = new Database(resolved);

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(SUPERADMIN_USERNAME);
    if (existing) {
      const hash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
      db.prepare(
        `UPDATE users SET password_hash = ?, role = 'superadmin', active = 1 WHERE lower(username) = lower(?)`,
      ).run(hash, SUPERADMIN_USERNAME);
      console.log(`✓ Superadmin '${SUPERADMIN_USERNAME}' updated (password + role refreshed).`);
      db.close();
      return;
    }

    db.prepare(`INSERT INTO users (id, email, username, password_hash, role, active, created_at)
                VALUES (?, ?, ?, ?, 'superadmin', 1, ?)`)
      .run(id, SUPERADMIN_EMAIL, SUPERADMIN_USERNAME, passwordHash, now);
    db.close();
    console.log(`✓ Superadmin '${SUPERADMIN_USERNAME}' created successfully.`);
  }

  console.log('');
  console.log('Login credentials:');
  console.log(`  Username: ${SUPERADMIN_USERNAME}`);
  console.log(`  Password: [as provided]`);
  console.log('');
  console.log('⚠️  This account is protected and cannot be deleted or disabled through the admin panel.');
}

ensureSuperadmin().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
