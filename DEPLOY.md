# Demoz production deploy (Neon + Render + Vercel)

| Service | URL |
|---------|-----|
| Frontend | https://demoz-rho.vercel.app |
| Backend API | https://demoz-tfts.onrender.com |
| Database | Neon PostgreSQL |

---

## 1. Push code to GitHub

From repo root (`Demoz_V1`):

```powershell
git status
git add .
git commit -m "Invite-only auth, super admin portal, landing updates, production cookie fix"
git push origin main
```

Render (`tenant-backend` root) and Vercel will redeploy from `main`.

---

## 2. Neon database (one-time migration fix)

Your Neon DB already has tables from an earlier deploy. Do **not** run `migrate reset` on production.

**On your PC** (PowerShell), use the **exact** connection string copied from Neon (do not type the password by hand).

Important: `tenant-backend/.env` has a **local** `DATABASE_URL` (localhost). Prisma loads `.env` on every command. Either paste the Neon URL into `.env` temporarily, or set `$env:DATABASE_URL` in the **same** PowerShell window **before** each Prisma command (see below).

```powershell
cd tenant-backend

# Paste the full string from Neon → Connect → Pooled connection → Copy
# Use SINGLE quotes so PowerShell does not break special characters in the password
$env:DATABASE_URL='postgresql://neondb_owner:PASTE_EXACT_PASSWORD_FROM_NEON@ep-floral-firefly-aqlgxb95-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require'

# Mark baseline as already applied (DB already has schema)
npx prisma migrate resolve --schema=./prisma/schema.prisma --applied 00000000000000_baseline

# Apply invite-only migration
npm run db:migrate:deploy
```

If `migrate resolve` says migration is already applied, skip to `db:migrate:deploy` only.

**Seed Super Admin** (once):

```powershell
$env:SUPER_ADMIN_EMAIL="iqbalezedin@gmail.com"
$env:SUPER_ADMIN_PASSWORD="YourSecurePassword12+"
npm run seed:super-admin
```

---

## 3. Render environment variables

Service: **demoz** → Environment. Set or update:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Neon **pooler** URL (`...-pooler....neon.tech/neondb?sslmode=require`) |
| `FRONTEND_URL` | `https://demoz-rho.vercel.app` |
| `BACKEND_URL` | `https://demoz-tfts.onrender.com` |
| `NODE_ENV` | `production` |
| `JWT_PRIVATE_KEY` | RSA private key (multiline PEM) |
| `JWT_PUBLIC_KEY` | RSA public key (multiline PEM) |
| `UPSTASH_REDIS_URL` | Upstash rediss URL |
| `CHAPA_SECRET_KEY` | Live secret |
| `CHAPA_WEBHOOK_SECRET` | Webhook secret |
| `PRISMA_FIELD_ENCRYPTION_KEY` | Same as local |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID |
| `SENTRY_DSN` | Optional |

You can remove `JWT_SECRET` if RS256 keys are set. `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` are optional if `UPSTASH_REDIS_URL` is set.

**Build command** (keep):

```
npm ci --include=dev && npm run db:generate && npm run db:migrate:deploy && npm run build
```

**Start command:**

```
npm run start:prod
```

**Chapa webhook URL:** `https://demoz-tfts.onrender.com/api/v1/webhooks/chapa`

After saving env vars, trigger **Manual Deploy** on Render.

---

## 4. Vercel environment variables

Project for https://demoz-rho.vercel.app → Settings → Environment Variables:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://demoz-tfts.onrender.com` |
| `NEXT_PUBLIC_SOCKET_URL` | `https://demoz-tfts.onrender.com` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Same as Render `GOOGLE_CLIENT_ID` |

**Root directory:** `tenant-frontend` (if not already set).

Redeploy after saving variables.

---

## 5. Google OAuth (required for Google sign-in)

[Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your **Web client**:

**Authorized JavaScript origins**

- `https://demoz-rho.vercel.app`
- `http://localhost:3000` (local dev)

**Authorized redirect URIs** (if using redirect flow later)

- `https://demoz-rho.vercel.app`
- `http://localhost:3000`

Copy **Client ID** into Render `GOOGLE_CLIENT_ID` and Vercel `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

---

## 6. Verify production

1. Open https://demoz-rho.vercel.app — new landing page should load after Vercel deploy.
2. https://demoz-tfts.onrender.com/health or your health route — API up.
3. https://demoz-rho.vercel.app/login — sign in as Super Admin (email/password from seed).
4. You should land on **/admin-portal** — provision a test company.
5. Sign in as that company admin (Google or provisional password).

---

## 7. Security note

If you pasted Neon passwords in chat or commits, **rotate the Neon database password** in the Neon console and update `DATABASE_URL` on Render.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Render build fails on `migrate deploy` | Run Neon steps in section 2 from your PC first |
| Login works locally but not on Vercel | Check `FRONTEND_URL` on Render and cookie fix is deployed |
| CORS error | `FRONTEND_URL` must exactly match Vercel URL (no trailing slash) |
| Google button missing | Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on Vercel and redeploy |
| Old landing page on Vercel | Confirm latest `main` is deployed; clear cache or hard refresh |
