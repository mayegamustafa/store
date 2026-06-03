# TotalStore — System Architecture Blueprint

## Overview

TotalStore is a Noon/Amazon-style multivendor eCommerce platform built for Uganda and East Africa. It supports buyers, sellers, admins, and delivery riders through 5 dedicated apps sharing a single NestJS API backend.

---

## High-Level Architecture

```
                    ┌─────────────────────────────────────────────────────┐
                    │                   NGINX Reverse Proxy                │
                    │  totalstore.ug │ admin.* │ seller.* │ api.*          │
                    └──────┬─────────────┬──────────────┬─────────────────┘
                           │             │              │
           ┌───────────────┼─────────────┼──────────────┼──────────────────┐
           │               │             │              │                   │
      ┌────▼────┐    ┌─────▼───┐   ┌────▼────┐   ┌────▼──────┐  ┌────────┐
      │  Web    │    │  Admin  │   │ Seller  │   │  NestJS   │  │Flutter │
      │Next.js  │    │Next.js  │   │ Next.js │   │  API :3001│  │  Apps  │
      │ :3000   │    │ :3002   │   │ :3003   │   │           │  │        │
      └─────────┘    └─────────┘   └─────────┘   └──┬────────┘  └────────┘
                                                      │
              ┌───────────────────────────────────────┤
              │               │                       │
        ┌─────▼──────┐ ┌──────▼─────┐       ┌────────▼───────┐
        │ PostgreSQL │ │   Redis     │       │   Cloudinary   │
        │  (Prisma)  │ │  (Cache/   │       │ (Image Storage)│
        │            │ │  Sessions) │       └────────────────┘
        └────────────┘ └────────────┘
```

---

## Application Stack

| App | Technology | Port | Purpose |
|-----|-----------|------|---------|
| `apps/api` | NestJS 10 + TypeScript | 3001 | REST API + WebSocket |
| `apps/web` | Next.js 14 (App Router) | 3000 | Buyer storefront |
| `apps/admin` | Next.js 14 (App Router) | 3002 | Admin panel |
| `apps/seller` | Next.js 14 (App Router) | 3003 | Seller dashboard |
| `apps/mobile-buyer` | Flutter 3.x | — | Buyer mobile (Android) |
| `apps/mobile-rider` | Flutter 3.x | — | Rider mobile (Android) |

---

## Backend Architecture (`apps/api`)

### Module Structure

```
apps/api/src/
├── auth/          # JWT + OTP auth (Africa's Talking SMS)
├── users/         # User CRUD + profile
├── products/      # Product listing, search, inventory
├── categories/    # Category tree management
├── sellers/       # Seller onboarding + approval
├── orders/        # Order lifecycle management
├── cart/          # Shopping cart (DB-backed)
├── payments/      # Payment abstraction layer
│   ├── mtn-momo/  # MTN Uganda Mobile Money API
│   ├── airtel/    # Airtel Money API
│   └── pesapal/   # Pesapal v3 (card/bank)
├── delivery/      # Delivery assignment + tracking
├── riders/        # Rider management + earnings
├── reviews/       # Product reviews + ratings
├── coupons/       # Discount coupon management
├── flash-sales/   # Flash sale campaigns
├── banners/       # Homepage banners (admin CRUD)
├── notifications/ # FCM push + SMS + Email dispatcher
├── tracking/      # WebSocket GPS tracking gateway
├── upload/        # Cloudinary file upload
└── admin/         # Admin utilities + reporting
```

### Authentication Flow

```
POST /api/auth/login
  └─ Phone + Password → JWT access (15min) + refresh (7d)

POST /api/auth/request-otp → Africa's Talking SMS code
POST /api/auth/verify-otp  → Passwordless login

POST /api/auth/refresh → Rotate tokens
```

### Payment Abstraction

```
PaymentService
  ├── initiate(orderId, method, amount, phone?)
  │     ├── MtnMomoService  → MTN Uganda Collection API
  │     ├── AirtelService   → Airtel Money Uganda API
  │     ├── PesapalService  → Pesapal v3 iframe/redirect
  │     └── CodService      → Mark as COD, pay on delivery
  └── handleCallback(provider, payload) → verify + mark PAID
```

### Real-Time GPS Tracking

```
Socket.io Namespace: /tracking
  Events:
    Client emits:  joinOrderRoom  { orderId }
    Server emits:  riderLocation  { orderId, lat, lng }
                   statusUpdate   { orderId, status }
  
  Rider app → emits location every 10s via DeliveryProvider
  Buyer app → listens on order room for live map updates
```

---

## Database Design (Prisma / PostgreSQL)

### Core Models

| Model | Description |
|-------|------------|
| `User` | All platform users (role: BUYER/SELLER/RIDER/ADMIN) |
| `Seller` | Seller store profile, KYC, commission rate |
| `Rider` | Rider profile, vehicle info, online status |
| `Product` | Products with images, variants, status workflows |
| `ProductVariant` | Size/color/type variants with own pricing |
| `Category` | Hierarchical category tree |
| `Order` | Order with items, status, payment, delivery |
| `OrderItem` | Line items linked to product + variant |
| `Cart` | Persistent cart tied to user session |
| `CartItem` | Cart line items |
| `Address` | Saved delivery addresses |
| `Payment` | Payment records with provider + status |
| `Review` | Product ratings and text reviews |
| `Coupon` | Discount codes (fixed/percentage) |
| `FlashSale` | Time-limited sale campaigns |
| `FlashSaleItem` | Products in flash sale with sale price |
| `Banner` | Homepage promotional banners |
| `Notification` | In-app notification log |
| `Setting` | Key-value platform configuration |
| `SellerPayout` | Seller payout requests + status |
| `RiderEarning` | Per-delivery earnings for riders |

---

## Frontend Architecture

### Buyer Web (`apps/web`) — Next.js 14 App Router

```
State: Zustand (persisted cart + auth) + TanStack Query (server state)
Auth:  JWT stored in localStorage, auto-refresh interceptor in axios
Pages: / → products → [slug] → cart → checkout → orders → orders/[id]/track
```

### Admin Panel (`apps/admin`) — Next.js 14

```
State: Zustand admin auth store
Pages: dashboard, orders, sellers, products (approval), banners, settings
Auth:  Role check: user.role must be ADMIN
```

### Seller Dashboard (`apps/seller`) — Next.js 14

```
State: Zustand seller auth + profile store
Pages: dashboard, products (CRUD), orders, finance (payouts), onboarding
Auth:  Role check: user.role must be SELLER
```

### Mobile Apps — Flutter 3 / Material 3

```
Navigation:  GoRouter with ShellRoute for bottom nav + auth guards
State:       Provider (ChangeNotifier) for auth + cart/delivery
API:         Dio client with AuthInterceptor (auto-refresh on 401)
Storage:     FlutterSecureStorage for tokens
Maps:        Google Maps Flutter + Geolocator
Real-time:   socket_io_client for GPS tracking
Push:        Firebase Messaging + flutter_local_notifications
```

---

## Deployment Architecture

### Docker Compose Services

```yaml
services:
  postgres:  PostgreSQL 16
  redis:     Redis 7
  api:       NestJS API (Dockerfile in apps/api/)
  web:       Next.js buyer (standalone output)
  admin:     Next.js admin (standalone output)
  seller:    Next.js seller (standalone output)
  nginx:     Reverse proxy (nginx/nginx.conf)
```

### Environment Configuration

```
DATABASE_URL        → PostgreSQL connection
REDIS_URL           → Redis connection
JWT_SECRET          → Access token signing
REFRESH_SECRET      → Refresh token signing
CLOUDINARY_*        → Image upload
MTN_MOMO_*          → MTN Uganda API keys
AIRTEL_*            → Airtel Money API keys
PESAPAL_*           → Pesapal v3 credentials
AT_API_KEY          → Africa's Talking (SMS)
FIREBASE_*          → Push notifications
```

---

## Security Architecture

| Layer | Measure |
|-------|---------|
| Transport | HTTPS (TLS via Nginx + Let's Encrypt) |
| Auth | JWT HS256, 15min access + 7d refresh rotation |
| OTP | 6-digit, 10min expiry, rate-limited to 3/hour/phone |
| Passwords | bcrypt with cost factor 10 |
| API | Rate limiting on auth endpoints (10 req/min) |
| Admin | Role-based guard — only ADMIN role can access admin routes |
| Payments | Webhook signature verification for all providers |
| Uploads | File type + size validation, stored in Cloudinary (no local) |

---

## Data Flow: Order Lifecycle

```
Buyer places order
  │
  ├─ POST /orders           → Order created (PENDING)
  ├─ POST /payments/init    → Payment initiated
  │     └─ MTN/Airtel/Pesapal/COD
  ├─ [Webhook] payment confirmed → Order PAID
  ├─ Seller notified (push + email)
  │     └─ Seller confirms → CONFIRMED
  │     └─ Seller processes → PROCESSING
  ├─ Admin/system assigns rider → SHIPPED
  │     └─ Rider picks up → location tracking starts
  ├─ Rider updates location every 10s → WebSocket /tracking
  │     └─ Buyer sees live map
  └─ Rider delivers → DELIVERED
        └─ Buyer can leave review
        └─ Seller balance updated
        └─ Rider earning recorded
```

---

## Monitoring & Observability

- **API Docs**: Swagger UI at `api.totalstore.ug/api/docs`
- **Health Check**: `GET /api/health` → returns DB + Redis + uptime status
- **Logging**: Winston structured JSON logs
- **Error Tracking**: Sentry (to be integrated in production)
- **Uptime**: Docker health checks on all services
