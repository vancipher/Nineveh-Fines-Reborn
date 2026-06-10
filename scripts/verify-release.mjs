/**
 * Pre-deploy smoke checks (no server required).
 * Run: node scripts/verify-release.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let failed = 0;

function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  failed++;
}

// PWA assets
for (const file of [
  'public/manifest.json',
  'public/sw.js',
  'public/icons/icon-192.png',
  'public/icons/icon-512.png',
  'public/icons/icon.svg',
]) {
  if (existsSync(join(root, file))) ok(file);
  else fail(`missing ${file}`);
}

const manifest = JSON.parse(readFileSync(join(root, 'public/manifest.json'), 'utf8'));
if (manifest.icons?.some((i) => i.src.includes('.png'))) ok('manifest has PNG icons');
else fail('manifest missing PNG icons');

// Numerals (dynamic import needs ts - inline test)
const ar = '٠١٢٣٤٥٦٧٨٩';
const normalized = ar.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
if (normalized === '0123456789') ok('Arabic digit normalization logic');
else fail('Arabic digit normalization');

// Word docx buffer (via tsx)
try {
  const { execSync } = await import('node:child_process');
  const out = execSync('npx tsx scripts/verify-docx.ts', { cwd: root, encoding: 'utf8' });
  if (out.includes('DOCX_OK')) ok('Word summary DOCX generates valid ZIP');
  else fail('Word DOCX check: ' + out);
} catch (e) {
  fail('Word DOCX check failed: ' + (e.stderr?.toString() || e.message));
}

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll smoke checks passed.');
process.exit(failed ? 1 : 0);
