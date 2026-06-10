import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';
import fs from 'fs';

function generateStrongPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*_-+=';
  const all = upper + lower + digits + symbols;
  const pick = (chars, n) =>
    Array.from({ length: n }, () => chars[crypto.randomInt(chars.length)]).join('');
  const parts = [pick(upper, 4), pick(lower, 6), pick(digits, 4), pick(symbols, 4), pick(all, 4)];
  for (let i = parts.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [parts[i], parts[j]] = [parts[j], parts[i]];
  }
  return parts.join('');
}

const USERNAME = 'AbdullahYasir';
const password = process.env.SUPERADMIN_PASSWORD?.trim() || generateStrongPassword();

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const hash = await bcrypt.hash(password, 12);
const { rows } = await client.execute({
  sql: 'SELECT id FROM users WHERE lower(username) = lower(?)',
  args: [USERNAME],
});

if (rows.length === 0) {
  console.error('User not found. Run: npm run setup:superadmin');
  process.exit(1);
}

await client.execute({
  sql: "UPDATE users SET password_hash = ?, role = 'superadmin', active = 1 WHERE id = ?",
  args: [hash, rows[0].id],
});

const envLine = `SUPERADMIN_PASSWORD=${password}`;
let envContent = fs.existsSync('.env') ? fs.readFileSync('.env', 'utf8') : '';
if (/^SUPERADMIN_PASSWORD=/m.test(envContent)) {
  envContent = envContent.replace(/^SUPERADMIN_PASSWORD=.*$/m, envLine);
} else {
  envContent += `\n${envLine}\n`;
}
fs.writeFileSync('.env', envContent);

console.log('Superadmin password updated on Turso.');
console.log('Username:', USERNAME);
console.log('Password:', password);
console.log('(Also saved to .env as SUPERADMIN_PASSWORD)');
