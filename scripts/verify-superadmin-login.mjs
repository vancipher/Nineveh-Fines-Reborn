import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const PASSWORD =
  process.env.SUPERADMIN_PASSWORD ??
  "*#WkFC}sA82?Z'q>xao2Tj2Wt2B&bf1lAkYY/zKq{%`~NX8Z0V";

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const { rows } = await client.execute({
  sql: 'SELECT id, username, email, role, active, password_hash FROM users WHERE lower(username) = lower(?)',
  args: ['AbdullahYasir'],
});

console.log('DATABASE_URL:', process.env.DATABASE_URL?.slice(0, 40) + '...');
console.log('Users found:', rows.length);

if (rows.length === 0) {
  console.log('NO USER — account missing');
  process.exit(1);
}

const u = rows[0];
console.log('User:', { id: u.id, username: u.username, role: u.role, active: u.active });
console.log('Hash prefix:', String(u.password_hash).slice(0, 20));

const ok = await bcrypt.compare(PASSWORD, u.password_hash);
console.log('bcrypt.compare(default script password):', ok);

// Test production API if APP_URL set
const base = process.env.APP_URL || 'https://fines-system-reborn.vercel.app';
for (const login of ['AbdullahYasir', 'abdullahyasir']) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password: PASSWORD }),
  });
  const data = await res.json().catch(() => ({}));
  console.log(`API ${base} login="${login}":`, res.status, data);
}
