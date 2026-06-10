import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const USERNAME = 'AbdullahYasir';
/** Use SUPERADMIN_PASSWORD in .env — default is mobile-friendly (no RTL-breaking quotes/backticks). */
const PASSWORD = process.env.SUPERADMIN_PASSWORD ?? 'AbdullahYasir@Fines2026!';

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const { rows } = await client.execute({
  sql: 'SELECT id, username, email, role, active, length(password_hash) as hash_len FROM users WHERE lower(username) = lower(?)',
  args: [USERNAME],
});

if (rows.length === 0) {
  console.log('User not found — run: npm run setup:superadmin');
  process.exit(1);
}

const row = rows[0];
console.log('Found:', row);

const hash = await bcrypt.hash(PASSWORD, 12);
const verify = await bcrypt.compare(PASSWORD, hash);

const upd = await client.execute({
  sql: "UPDATE users SET password_hash = ?, role = 'superadmin', active = 1 WHERE id = ?",
  args: [hash, row.id],
});

console.log('Password reset OK, rows:', upd.rowsAffected);
console.log('bcrypt self-check:', verify);
console.log('Login with username exactly:', row.username);
console.log('Password length:', PASSWORD.length);
