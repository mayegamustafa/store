# TotalStore — Uganda's Multivendor eCommerce Platform

A full-stack multivendor marketplace built for Uganda & East Africa. Supports buyers, sellers, delivery riders, and admins through dedicated apps powered by a single NestJS API.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API | NestJS 10 + TypeScript + Prisma ORM |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Web (Buyer) | Next.js 14 (App Router) |
| Admin Panel | Next.js 14 (App Router) |
| Seller Dashboard | Next.js 14 (App Router) |
| Mobile Apps | Flutter 3 (buyer, seller, rider) |
| Reverse Proxy | Nginx |
| Payments | MTN MoMo, Airtel Money, Pesapal |
| SMS / OTP | Africa's Talking |
| Storage | Cloudinary |
| Push Notifications | Firebase FCM |

---

## Project Structure

```
total-store/
├── apps/
│   ├── api/            # NestJS REST API + WebSocket (port 3001)
│   ├── web/            # Buyer storefront — Next.js (port 3000)
│   ├── admin/          # Admin panel — Next.js (port 3002)
│   ├── seller/         # Seller dashboard — Next.js (port 3003)
│   ├── mobile-buyer/   # Flutter buyer app
│   ├── mobile-rider/   # Flutter rider app
│   └── mobile-seller/  # Flutter seller app
├── nginx/              # Nginx config
├── docker-compose.yml  # Full-stack Docker orchestration
├── deploy.sh           # Production deploy script
└── .env.example        # Environment variable template
```

---

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Flutter 3.x (for mobile apps)
- PostgreSQL 16 (or use Docker)
- Redis 7 (or use Docker)

---

## Quick Start (Local Development)

### 1. Clone & install dependencies

```bash
git clone https://github.com/mayegamustafa/store.git total-store
cd total-store
npm install
```

### 2. Set up environment

```bash
cp .env.example .env
# Edit .env with your real values
```

Also create API-specific env:
```bash
cp apps/api/.env.example apps/api/.env   # if present, or copy from root .env.example
# Set DATABASE_URL, JWT_SECRET, etc.
```

### 3. Start infrastructure (DB + Redis)

```bash
docker compose up -d postgres redis
```

### 4. Run database migrations + seed

```bash
cd apps/api
npm install
npx prisma migrate deploy
npm run db:seed
```

### 5. Start all apps (dev mode)

```bash
# From project root
npm run dev
# Or start individually:
cd apps/api   && npm run dev   # API on :3001
cd apps/web   && npm run dev   # Web on :3000
cd apps/admin && npm run dev   # Admin on :3002
cd apps/seller && npm run dev  # Seller on :3003
```

---

## Docker Deployment (Production)

### 1. Configure environment

```bash
cp .env.example .env
# Fill in all production values (see Environment Variables section)
```

### 2. Build & start all services

```bash
docker compose up -d --build
```

### 3. Run migrations & seed (first deploy only)

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run db:seed
```

### 4. Using the deploy script

```bash
# Rebuild and restart a specific app
./deploy.sh api
./deploy.sh web
./deploy.sh all   # rebuild everything

# Skip DB migration (code-only hotfix)
SKIP_MIGRATIONS=1 ./deploy.sh api
```

---

## Environment Variables

Copy `.env.example` to `.env` and fill in real values:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing secret (use a long random string) |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `AT_API_KEY` | Africa's Talking API key (SMS/OTP) |
| `FIREBASE_PROJECT_ID` | Firebase project for push notifications |
| `PESAPAL_CONSUMER_KEY` | Pesapal payment gateway key |
| `MTN_MOMO_SUBSCRIPTION_KEY` | MTN Mobile Money subscription key |
| `AIRTEL_CLIENT_ID` | Airtel Money client ID |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name for image uploads |
| `SMTP_HOST` | SMTP server for email |
| `GOOGLE_MAPS_API_KEY` | Google Maps key for delivery tracking |

See `.env.example` for the full list.

---

## Database Migrations

```bash
# Apply all pending migrations (production)
cd apps/api && npx prisma migrate deploy

# Create a new migration (dev only)
cd apps/api && npm run db:migrate

# Regenerate Prisma client after schema changes
cd apps/api && npm run db:generate

# Open Prisma Studio (database GUI)
cd apps/api && npm run db:studio
```

---

## Seed Data

After running migrations, seed the database with demo data:

```bash
cd apps/api && npm run db:seed
```

This creates:

### Admin Account
| Email | Password | Role |
|-------|----------|------|
| admin@totalstore.ug | Admin@2024! | SUPER_ADMIN |

### Demo Seller Accounts
| Email | Password | Store |
|-------|----------|-------|
| seller.tech@demo.com | Seller@2024! | TechHub Uganda |
| seller.fashion@demo.com | Seller@2024! | Trendy UG |
| seller.home@demo.com | Seller@2024! | HomeStyle UG |
| seller.sports@demo.com | Seller@2024! | Active Uganda |
| seller.beauty@demo.com | Seller@2024! | Glow Beauty UG |

### Seed includes
- **10 product categories** (Electronics, Fashion, Home & Living, Sports, Beauty, Groceries, Books, Automotive, Baby & Kids, Garden)
- **40+ products** across all categories with real UGX prices, images, ratings
- **1 active flash sale** (Weekend Flash Sale) with discounted items
- **Homepage banners** (hero, middle, bottom slots)
- **Platform settings** (currency=UGX, commission=10%, escrow=3 days)

> **Change passwords immediately** before going to production.

---

## Mobile Apps (Flutter)

```bash
cd apps/mobile-buyer   # or mobile-rider / mobile-seller
flutter pub get
flutter run
```

### Build APKs

```bash
# From project root
./scripts/build-apks.sh

# Or individually
cd apps/mobile-buyer && flutter build apk --release
```

---

## API Endpoints

Base URL: `http://localhost:3001/api/v1`

| Module | Prefix |
|--------|--------|
| Auth | `/auth` |
| Products | `/products` |
| Categories | `/categories` |
| Orders | `/orders` |
| Cart | `/cart` |
| Payments | `/payments` |
| Sellers | `/sellers` |
| Riders | `/riders` |
| Admin | `/admin` |
| Flash Sales | `/flash-sales` |
| Coupons | `/coupons` |
| Analytics | `/analytics` |

Full API docs (Swagger): `http://localhost:3001/api/docs`

---

## Nginx Configuration

The `nginx/nginx.conf` routes:
- `/` → Web app (port 3000)
- `/api/*` → API (port 3001)
- `/admin/*` → Admin panel (port 3002)
- `/seller/*` → Seller dashboard (port 3003)

For SSL, place your certificates in `nginx/ssl/`:
```
nginx/ssl/cert.pem
nginx/ssl/key.pem
```

---

## Security Notes

- Never commit `.env` files — they are gitignored
- Never commit `android-keystore/` — contains signing keys
- Change all default passwords from seed before production
- Set strong `JWT_SECRET` and `JWT_REFRESH_SECRET` in production
- Enable `NODE_ENV=production` in all production deployments

---

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system architecture diagram and module breakdown.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features.
