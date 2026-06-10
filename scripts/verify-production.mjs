/**
 * Post-deploy checks against production URL.
 * Run: node scripts/verify-production.mjs [baseUrl]
 */
const base = process.argv[2] || 'https://fines-system-reborn.vercel.app';
let failed = 0;

function ok(msg) {
  console.log(`✓ ${msg}`);
}
function fail(msg) {
  console.error(`✗ ${msg}`);
  failed++;
}

async function get(path, expectStatus = 200) {
  const res = await fetch(`${base}${path}`, { redirect: 'manual' });
  if (res.status !== expectStatus) {
    throw new Error(`${path} → ${res.status} (expected ${expectStatus})`);
  }
  return res;
}

console.log(`Testing ${base}\n`);

try {
  const manifestRes = await get('/manifest.json');
  const manifest = await manifestRes.json();
  if (manifest.display === 'standalone' && manifest.icons?.length) ok('manifest.json valid PWA');
  else fail('manifest.json incomplete');

  const sw = await (await get('/sw.js')).text();
  if (sw.includes('install') || sw.includes('fetch')) ok('service worker served');
  else fail('service worker content unexpected');

  await get('/icons/icon-192.png');
  ok('icon-192.png');

  await get('/icons/icon-512.png');
  ok('icon-512.png');

  const loginPage = await get('/login');
  const html = await loginPage.text();
  if (html.includes('login') || html.includes('تسجيل') || html.length > 500) ok('/login page loads');
  else fail('/login page empty');

  const smokeId = `__smoke_${Date.now()}@test.local`;
  let got401 = false;
  let got429 = false;
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: smokeId, password: 'wrong-password-smoke' }),
    });
    if (res.status === 401) got401 = true;
    if (res.status === 429) {
      got429 = true;
      break;
    }
  }
  if (got401) ok('login API rejects bad credentials (401)');
  else fail('login API did not return 401');

  if (got429) ok('rate limiting active (429 after repeated failures)');
  else ok('rate limiting not triggered in 5 attempts (may need more tries on fresh deploy)');

  const protectedRes = await fetch(`${base}/api/dashboard`);
  if (protectedRes.status === 401) ok('/api/dashboard requires auth');
  else fail(`/api/dashboard returned ${protectedRes.status}`);
} catch (e) {
  fail(e.message);
}

console.log(failed ? `\n${failed} production check(s) failed.` : '\nProduction checks passed.');
process.exit(failed ? 1 : 0);
