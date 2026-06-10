# Nineveh Traffic Fines (Reborn)

Lightweight web app for **Nineveh Traffic Directorate** daily fines entry. Officers read numbers from a paper sheet on one device and speak them into this app on another (phone/tablet). **No OCR** — voice + manual table edit only.

## Architecture

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend + API | **Next.js 15** (App Router) | Vercel-ready, responsive, API routes in one repo |
| Database | **SQLite** (local) / **Turso** (prod) | Free tiers, simple schema, no Docker |
| Auth | **JWT httpOnly cookies** + **bcrypt** | Lightweight, no NextAuth dependency |
| Speech | **Web Speech API** (browser) | Fully free, online, Arabic in Chrome/Edge; swappable via `src/lib/voice/stt.ts` |
| Excel | **exceljs** + official template in `/Assets` | RTL Arabic layout matching directorate workbook |

## Quick start (local)

```bash
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run db:setup
npm run dev
```

Open http://localhost:3000

### Demo login (seeded on first run)

| Field | Default |
|-------|---------|
| Username | `admin` |
| Password | `Admin123!` |

Override via `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL` in `.env` before first `db:seed`.

## Project layout

```
Assets/                 Official Excel template (Arabic) — do not delete
data/                   Local SQLite file (gitignored)
src/
  app/                  Pages + API routes
  components/           UI (voice panel, entry table, shell)
  lib/
    auth/               Session + bcrypt
    db/                 Drizzle schema, migrate, seed
    excel/              Export generator
    voice/              STT provider + command parser
    data/catalog.ts     Seed data (59 violations, 11 sectors)
```

## User flow

1. Sign in
2. **Dashboard** — totals, today, this week, per-sector bars
3. **New entry** — pick sector + date → tap mic → speak `مخالفة 5، العدد 5، المبلغ 200000` → review/edit table → save
4. **Export** — daily / weekly / monthly / custom range + sector filter → download `.xlsx`
5. **Admin** — sectors, violations, users, voice language

## Voice input (3 steps)

Each violation: **step 1** violation # → **step 2** count → **step 3** amount.

You can **type numbers** in the big field (always works), or use voice:

| Method | When to use |
|--------|-------------|
| **Type number + Next** | Always works — no mic, no HTTPS |
| **Record 5 sec** | Best fix for Edge/network errors — needs `GROQ_API_KEY` in `.env` |
| **Live speech** | Chrome on PC localhost only — often fails on Edge / phone |

### Fix: red “network” error in Edge

This almost always means the browser **cannot use cloud speech** on your current URL:

1. **Phone on `http://192.168.x.x:3000`** → blocked. Run HTTPS dev server:
   ```bash
   npm run dev:https
   ```
   Then on phone open `https://YOUR-PC-IP:3000` (accept the certificate warning once).

2. **Add free server STT** (recommended — works on phone + Edge):
   - Sign up at [console.groq.com](https://console.groq.com) (free tier)
   - Add to `.env`: `GROQ_API_KEY=gsk_...`
   - Restart `npm run dev`
   - Use **«تسجيل 5 ثوان» / Record 5 sec** for each step

3. **Or skip voice** — type each number in the field and tap **التالي / Next**.

4. Admin → Settings → set voice language to **ar-SA** (not ar-IQ) if using live speech.

### Speech services

| Service | Cost | Notes |
|---------|------|-------|
| Web Speech API | Free | Live preview; needs HTTPS/localhost; Edge often fails |
| Groq Whisper (`GROQ_API_KEY`) | Free tier | Record 5 sec → server transcribes; reliable |
| Manual typing | Free | Always available in the step wizard |

## Excel export

- Uses the official workbook in `Assets/موقف المخالفات مع المبالغ.xlsx`
- Fills sector count/amount columns for the selected date range
- Adds sheet **ملخص التصدير** with per-sector totals
- Preserves template formulas where possible

Filter presets: **daily**, **weekly**, **monthly**, **custom** from–to dates, plus multi-select sectors.

## Admin capabilities

Stored in **database** (seeded once from official lists):

- Add / edit / disable **sectors** (starts with 11; unlimited)
- Add / edit / disable **violation types** (starts with 59)
- Manage **users** (admin, operator, viewer)
- Set **voice language** (`ar-IQ`, `ar-SA`, `en-US`)

## Environment variables

See `.env.example`:

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | ≥32 chars random string |
| `DATABASE_URL` | Yes | `file:./data/local.db` or Turso URL |
| `TURSO_AUTH_TOKEN` | Prod (Turso) | Turso auth token |
| `ADMIN_*` | No | First-run admin seed |
| `DEFAULT_VOICE_LANGUAGE` | No | Default `ar-IQ` |
| `TEMPLATE_XLSX` | No | Override template path |

## Deploy to Vercel

1. Push repo to GitHub
2. Import project in Vercel
3. Create a **Turso** database (free tier):
   ```bash
   turso db create nineveh-fines
   turso db show nineveh-fines --url
   turso db tokens create nineveh-fines
   ```
4. Set Vercel env vars:
   - `AUTH_SECRET`
   - `DATABASE_URL` = Turso libsql URL
   - `TURSO_AUTH_TOKEN`
   - `ADMIN_EMAIL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
5. **Build command:** `npm run db:migrate && npm run db:seed && npm run build`
   - Or run migrate/seed once manually against Turso before first deploy
6. Deploy

> **Note:** `better-sqlite3` is for local dev only. Vercel serverless requires Turso (or Neon Postgres with a Drizzle adapter change).

## Free-tier limits (v1)

| Service | Tier | Notes |
|---------|------|-------|
| Vercel | Hobby | Serverless functions, HTTPS |
| Turso | Free | 9GB storage, 500M rows read/mo |
| Web Speech API | Free | Browser-dependent; Chrome recommended |
| exceljs | OSS | No cost |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run db:migrate` | Create tables |
| `npm run db:seed` | Seed admin, 59 violations, 11 sectors |
| `npm run db:setup` | migrate + seed |

## Roles

| Role | Capabilities |
|------|----------------|
| **admin** | Full access + admin screens |
| **operator** | Entries, export, dashboard |
| **viewer** | Dashboard read-only (no save/export) |

## Security

- Passwords hashed with bcrypt (12 rounds)
- httpOnly session cookie (JWT, 7 days)
- Login rate limit: 8 attempts / 15 min per username
- Zod validation on API inputs
- HTTPS enforced in production cookies

## Not in v1

- Photo OCR / Tesseract / vision on images
- Offline speech models
- Heavy charts or feature creep

## License

**Van Cipher Restricted License v1.0** — see [LICENSE](LICENSE).

Built for Nineveh traffic fines workflow — **all rights reserved**. You may read this repo on GitHub for learning. **Any deployment, government use, or redistribution requires written permission** from [Abdullah Y. Habash (@vancipher)](https://github.com/vancipher).
