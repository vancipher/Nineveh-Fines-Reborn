# Deploy to Vercel (test from phone/tablet/other PCs)

Vercel cannot use local SQLite. You need **Turso** (free) for the database.

## 1. Create Turso database

1. Sign up at [turso.tech](https://turso.tech) (free)
2. Install CLI (PowerShell):
   ```powershell
   irm get.tur.so/install.ps1 | iex
   ```
3. Login and create DB:
   ```powershell
   turso auth login
   turso db create nineveh-fines
   turso db show nineveh-fines --url
   turso db tokens create nineveh-fines
   ```
4. Save the **Database URL** (`libsql://...`) and **Auth Token**

## 2. Seed the cloud database (once)

In PowerShell, from the project folder:

```powershell
$env:DATABASE_URL = "libsql://YOUR-DB.turso.io"
$env:TURSO_AUTH_TOKEN = "YOUR-TOKEN"
$env:AUTH_SECRET = "your-long-random-secret-at-least-32-characters"
npm run db:migrate
npm run db:seed
```

## 3. Deploy to Vercel

### Option A — Vercel CLI (fastest)

```powershell
npm i -g vercel
vercel login
vercel link
vercel env add AUTH_SECRET
vercel env add DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add ADMIN_USERNAME
vercel env add ADMIN_PASSWORD
vercel env add ADMIN_EMAIL
vercel deploy --prod
```

After first deploy, note your URL (e.g. `https://fines-system-reborn.vercel.app`) and set:

```powershell
vercel env add APP_URL production
# value: https://your-project.vercel.app
```

Redeploy: `vercel deploy --prod`

### Option B — GitHub + Vercel dashboard

1. Push repo to GitHub
2. [vercel.com/new](https://vercel.com/new) → Import repo
3. Add environment variables (Production):

| Variable | Value |
|----------|--------|
| `AUTH_SECRET` | Random string ≥32 chars |
| `DATABASE_URL` | Turso `libsql://...` URL |
| `TURSO_AUTH_TOKEN` | Turso token |
| `ADMIN_USERNAME` | `QaisHassan` |
| `ADMIN_PASSWORD` | Your admin password |
| `ADMIN_EMAIL` | Your email |
| `APP_URL` | `https://your-project.vercel.app` (after first deploy) |
| `GROQ_API_KEY` | Optional — voice on mobile |
| `GOOGLE_CLIENT_ID` | Optional — Drive backup (local only for DB file) |

4. Deploy

## 4. Google OAuth on Vercel (optional)

In Google Cloud Console → Credentials → add redirect URI:

```
https://YOUR-PROJECT.vercel.app/api/admin/backup/google/callback
```

> Drive backup uploads the **local** `.db` file — it works on your PC, not on Vercel/Turso. Use export Excel or Turso backups for cloud data.

## 5. Excel template on Vercel

Place the official `.xlsx` in `/Assets` or set `TEMPLATE_XLSX` env var to a path included in the repo.

## 6. Test from other devices

Open your Vercel URL on phone/tablet — HTTPS is included, so voice (Groq) works with `GROQ_API_KEY` set.

Login with the admin user you seeded (`QaisHassan` or values from `ADMIN_*` env vars).
