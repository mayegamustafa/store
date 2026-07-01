# Railway Deployment Guide — TotalStore

Deploys the monorepo (`apps/api`, `apps/web`, `apps/seller`, `apps/admin`) to Railway
as **four services** from the same GitHub repo, plus **Postgres** and **Redis** plugins.
Mobile apps (`apps/mobile-*`) are not deployed — they're built as APKs and distributed
separately.

**Repo:** `github.com/mayegamustafa/store` (branch `main`)

---

## Step 1 — Create the Railway project

1. Go to <https://railway.com/new>, sign in with GitHub.
2. Click **"Deploy from GitHub repo"** → pick `mayegamustafa/store` → **"Deploy Now"**.
3. Railway will start deploying the whole repo as one service. **Immediately stop that
   deploy** and delete the auto-created service — we'll add 4 explicit services below.

## Step 2 — Add the data plugins first

Data plugins must exist before the API service starts (its startup runs `prisma migrate deploy`).

1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**. Wait for it to provision.
2. Click **"+ New"** → **"Database"** → **"Add Redis"**. Wait for it to provision.

Postgres exposes a `DATABASE_URL` variable; Redis exposes `REDIS_URL`. We'll reference
these from the API service via Railway's variable-reference syntax (`${{Postgres.DATABASE_URL}}`).

## Step 3 — Add the API service

1. Click **"+ New"** → **"GitHub Repo"** → pick `mayegamustafa/store` again.
2. When the service appears, click it → **"Settings"** tab.
3. **Root Directory:** `apps/api`
4. **Watch Paths:** `apps/api/**` (optional, prevents rebuilds when only web changes).
5. Railway will pick up `apps/api/railway.json` — no need to set build/start commands
   manually. It uses Nixpacks with:
   - Build: `npm install --include=dev && npx prisma generate && npm run build`
   - Start: `npx prisma migrate deploy && node dist/main`
   - Healthcheck: `GET /api/health`
6. Rename the service to **"api"** for clarity.
7. Go to **"Variables"** tab — set the variables listed in [Step 6 § API](#api-service-variables) below.
8. Click **"Deploy"**.

## Step 4 — Add the web / seller / admin services

Repeat Step 3 three more times with these settings:

| Service | Root Directory | Suggested name | Default internal port |
|---|---|---|---|
| Buyer web | `apps/web` | `web` | 3000 |
| Seller dashboard | `apps/seller` | `seller` | 3003 |
| Admin panel | `apps/admin` | `admin` | 3002 |

Each app's `railway.json` (already committed) tells Railway how to build/start it. You
don't need to configure commands.

For each of these 3 Next.js services, set the variables in [Step 6 § Web/Seller/Admin](#web--seller--admin-service-variables).

## Step 5 — Generate public domains

For each of the 4 services:

1. **Settings** tab → **Networking** section → **"Generate Domain"**.
2. Railway assigns a `*.up.railway.app` URL. Copy it — you'll paste it into other services'
   env vars in Step 6.

You'll end up with roughly:

```
API    →  https://api-production-xxxx.up.railway.app
Web    →  https://web-production-xxxx.up.railway.app
Seller →  https://seller-production-xxxx.up.railway.app
Admin  →  https://admin-production-xxxx.up.railway.app
```

Later, once you're confident it works, you can attach your own domains
(e.g. `api.totalstore.ug`) in the same Networking section.

---

## Step 6 — Environment variables

Set these under each service's **"Variables"** tab. **Anything you don't have yet, set to a
placeholder and update later** — the API won't crash on missing external credentials, it
just won't call those providers.

### API service variables

**Core** (required for the app to start):

```
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=<generate a 64-char random hex — see § Generating secrets below>
JWT_REFRESH_SECRET=<generate a separate 64-char random hex>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

**Cross-service URLs** (fill in after Step 5):

```
API_URL=https://<api-service-domain>
WEB_URL=https://<web-service-domain>
ADMIN_URL=https://<admin-service-domain>
SELLER_URL=https://<seller-service-domain>
CORS_ORIGINS=https://<web>,https://<admin>,https://<seller>
```

**Payments — Pesapal** (required for buyer checkout):

```
PESAPAL_CONSUMER_KEY=<from Pesapal dashboard>
PESAPAL_CONSUMER_SECRET=<from Pesapal dashboard>
PESAPAL_API_URL=https://cybqa.pesapal.com/pesapalv3    # sandbox; use https://pay.pesapal.com/v3 for live
PESAPAL_IPN_URL=https://<api-service-domain>/api/v1/payments/ipn
```

**Payments — MTN MoMo (Uganda)** — leave placeholders if not activating yet:

```
MTN_MOMO_BASE_URL=https://sandbox.momodeveloper.mtn.com
MTN_MOMO_SUBSCRIPTION_KEY=<from MTN developer portal>
MTN_MOMO_API_USER=<from MTN>
MTN_MOMO_API_KEY=<from MTN>
MTN_MOMO_ENVIRONMENT=sandbox
MTN_MOMO_CALLBACK_URL=https://<api-service-domain>/api/v1/payments/callback/mtn_momo
```

**Payments — Airtel Money** — leave placeholders if not activating yet:

```
AIRTEL_CLIENT_ID=<from Airtel>
AIRTEL_CLIENT_SECRET=<from Airtel>
AIRTEL_BASE_URL=https://openapi.airtel.africa
AIRTEL_CALLBACK_URL=https://<api-service-domain>/api/v1/payments/callback/airtel_money
```

**SMS — Africa's Talking** (used for OTP + notifications):

```
AT_API_KEY=<from Africa's Talking dashboard>
AT_USERNAME=sandbox
AT_SENDER_ID=TotalStore
```

**Media — Cloudinary** (used for product/proof/signature images):

```
CLOUDINARY_CLOUD_NAME=<from Cloudinary dashboard>
CLOUDINARY_API_KEY=<from Cloudinary>
CLOUDINARY_API_SECRET=<from Cloudinary>
```

**Push — Firebase** (used for mobile FCM notifications):

```
FIREBASE_PROJECT_ID=<from Firebase console>
FIREBASE_CLIENT_EMAIL=<service-account email>
FIREBASE_PRIVATE_KEY=<full private key including BEGIN/END lines; wrap in quotes if pasted>
```

**Email — SMTP**:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your outgoing account>
SMTP_PASS=<Gmail app password or SMTP token>
SMTP_FROM=TotalStore <noreply@yourdomain>
```

**Optional integrations** (set only when activating):

```
GOOGLE_MAPS_API_KEY=<used server-side for Directions API — mobile has its own key>
STRIPE_SECRET_KEY=<international card payments — future>
STRIPE_WEBHOOK_SECRET=<from Stripe dashboard>
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_ENCRYPTION_KEY=
SENTRY_DSN=<backend Sentry DSN — M1.10 will consume this if present>
```

**Business config**:

```
DEFAULT_COMMISSION_PERCENT=10
ESCROW_PERIOD_DAYS=3
CURRENCY=UGX
COUNTRY_CODE=UG
PLATFORM_NAME=TotalStore
```

**Feature flags** (all safe defaults per the M1-M4a plan):

```
ROLES_GUARD_STRICT=false
SOCKETIO_REDIS_ADAPTER=true
```

### Web / Seller / Admin service variables

Each Next.js service only needs a few variables — the rest are baked in at build time as
`NEXT_PUBLIC_*` variables (accessible in client code).

```
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://<api-service-domain>/api/v1
NEXT_PUBLIC_SITE_URL=https://<this-service's-domain>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Google OAuth client for social sign-in — optional>
```

The Next.js apps read `process.env.PORT` from Railway automatically (via the `${PORT}`
substitution in each app's `railway.json`).

---

## Step 7 — Deploy order

Deploy in this order to avoid "URL not set" errors:

1. Postgres (already deployed in Step 2)
2. Redis (already deployed in Step 2)
3. **API** — wait until it's healthy at `/api/health` (should show green in Railway UI).
4. Update Web / Seller / Admin variables with the API's domain.
5. **Web, Seller, Admin** — deploy in parallel.
6. Update the API's `CORS_ORIGINS` and `WEB_URL/ADMIN_URL/SELLER_URL` with their final domains.
7. **Redeploy API** so it picks up the CORS list.

## Step 8 — Verify

1. `GET https://<api-domain>/api/health` → JSON `{"status":"ok",...}`.
2. `GET https://<api-domain>/api/docs` → Swagger UI opens.
3. `curl https://<web-domain>/robots.txt` → contains `Sitemap:` line.
4. `curl https://<web-domain>/sitemap.xml` → valid XML sitemap.
5. Load `https://<web-domain>/` → homepage renders (may be empty catalog on first deploy).
6. Register a test account via the web login → OTP arrives via SMS (if Africa's Talking is set).

## Step 9 — Attach custom domains (optional)

For each service, in **Settings → Networking → Custom Domain**:

- API   → `api.yourdomain`
- Web   → `www.yourdomain` or root
- Admin → `admin.yourdomain`
- Seller → `seller.yourdomain`

Railway provides the DNS records to add at your registrar. After DNS propagates,
**redeploy each service** so it picks up the new domain in env vars.

Also update the API's `CORS_ORIGINS` to the new custom domains, and update the mobile
apps' Setting-table keys `API_BASE_URL` and `APP_*_DOWNLOAD_URL`.

---

## Generating secrets

Run this on your laptop to produce a fresh 64-char JWT secret:

```
openssl rand -hex 32
```

Do this twice — once for `JWT_SECRET`, once for `JWT_REFRESH_SECRET`. Never reuse the
same secret; never commit them.

---

## Migrations & data seeding

The API's Railway `startCommand` runs `npx prisma migrate deploy` on every start. This is
idempotent — Prisma tracks which migrations have been applied and only runs pending ones.

To seed initial data (categories, admin user, plans), open a **shell to the API service**
(Railway → API service → the three-dot menu → **"Open Shell"**), then:

```
npx prisma db seed
```

This runs `prisma/seed.ts` (already in the repo).

---

## Deploy cadence

- **Push to `main`** → Railway auto-deploys every service watching that branch.
- **Only API changed?** Because we set `Watch Paths: apps/api/**` per service, only the
  API rebuilds. Same for the others. If you skip watch paths, all 4 rebuild on every push.

---

## Cost estimate

Railway's pay-as-you-go pricing (as of writing):

| Component | Approx. monthly at low usage |
|---|---|
| Postgres (1GB) | ~$5 |
| Redis (256MB) | ~$5 |
| API (0.5 vCPU / 512MB idle) | ~$5–10 |
| Web × 3 (Next.js) | ~$5–10 each |
| **Total (low traffic)** | **~$30–50/mo** |

Traffic bursts scale usage up. Set a **spending limit** in Railway's billing settings
before switching to production traffic.

---

## Rollback

Railway keeps a deployment history per service. To roll back:

1. Open the service → **"Deployments"** tab.
2. Find a green deployment older than the broken one.
3. Click the three-dot menu → **"Redeploy"**.

Rollback is per-service and takes ~30s. Database migrations are NOT rolled back — if a
migration itself caused the issue, restore from Postgres backup and revert the migration
file in git.

---

## Common gotchas

1. **"prisma: not found"** during first deploy — usually because `npm install` didn't run
   with `--include=dev`. The `railway.json` uses `--include=dev` explicitly. If you see
   this, check the build log's install step.

2. **CORS blocked** on the web app — `CORS_ORIGINS` on the API must include the exact
   scheme + host of each Next.js service (no trailing slash). Redeploy API after any
   change to this variable.

3. **Next.js port errors** — the `railway.json` uses `-p ${PORT:-3000}`. If Railway
   somehow doesn't inject `PORT`, the app falls back to its package.json default.

4. **Health check failing** — `apps/api/src/health/health.controller.ts` currently just
   returns `{status: 'ok'}` — it doesn't probe DB or Redis. That's on the M4b polish
   list. Meanwhile the health check will pass even if Postgres is down; check `/api/docs`
   as a stronger liveness signal.

5. **First-time migrations conflict** — if Prisma refuses to apply migrations because it
   doesn't recognize the DB state, open the API shell and run:
   ```
   npx prisma migrate resolve --applied "20260222093038_init"
   ```
   (adjust migration name).
