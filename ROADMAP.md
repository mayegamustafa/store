# TotalStore — Development Roadmap

## Vision

Build Uganda's most trusted multivendor eCommerce platform, starting with Kampala and expanding across East Africa. Target is 1,000 active sellers and 50,000 monthly buyers within 12 months of launch.

---

## Phase 1 — MVP (Months 1–3)

**Theme**: Core buying and selling, working payments, basic delivery

### Goals
- [ ] Launch buyer web app with product browsing and checkout
- [ ] Onboard first 50 sellers via seller dashboard
- [ ] Enable MTN MoMo + COD payments (most common in Uganda)
- [ ] Manual delivery assignment (admin assigns riders)
- [ ] Admin panel for operations team

### Features
- **Auth**: Phone-based OTP login for buyers; password login for sellers/riders
- **Marketplace**: Category browsing, search, product detail, reviews
- **Cart & Checkout**: Persistent cart, coupon codes, 2-step checkout
- **Payments**: MTN Mobile Money, Cash on Delivery
- **Seller Tools**: Product CRUD, order management, basic analytics
- **Orders**: Full order lifecycle PENDING → CONFIRMED → SHIPPED → DELIVERED
- **Admin**: Order management, seller approval, banner management
- **Notifications**: SMS OTP (Africa's Talking), push notifications (FCM)

### Technical Milestones
- [ ] Deploy API + PostgreSQL + Redis on DigitalOcean / AWS
- [ ] Configure Cloudinary for image storage
- [ ] Set up DNS (totalstore.ug, api.totalstore.ug, admin.*, seller.*)
- [ ] SSL certificates via Let's Encrypt
- [ ] CI/CD pipeline (GitHub Actions → Docker deploy)
- [ ] Database backups (daily automated)

### KPIs
- 50 active sellers
- 500 registered buyers
- 200 orders in month 3
- < 2s average page load time

---

## Phase 2 — Growth (Months 4–6)

**Theme**: Mobile-first, revenue optimization, delivery network

### Goals
- [ ] Launch Flutter buyer app on Google Play Store
- [ ] Build and deploy rider mobile app
- [ ] Enable Airtel Money + Pesapal (cards)
- [ ] Live GPS tracking for deliveries
- [ ] Flash sales and promotions engine

### Features
- **Mobile App (Buyer)**: Full shopping experience on Android
- **Mobile App (Rider)**: Delivery management with live GPS
- **Payments**: Add Airtel Money + Pesapal card payments
- **GPS Tracking**: Real-time rider ↔ buyer location via WebSocket
- **Flash Sales**: Admin-managed time-limited deals with countdown
- **Promotions**: Seller discount management, coupon campaigns
- **Seller Finance**: In-app payout requests (MTN/Airtel/Bank)
- **Reviews**: Enhanced review system with images
- **Recommendations**: "More from this seller", "Similar products"
- **Wishlist**: Saved items for buyers

### Technical Milestones
- [ ] Auto-scaling on API service (horizontal pods)
- [ ] Redis pub/sub for WebSocket tracking at scale
- [ ] Elasticsearch integration for product search
- [ ] CDN for media (Cloudinary auto-optimization)
- [ ] A/B testing framework for homepage experiments
- [ ] Performance monitoring (New Relic / DataDog)

### KPIs
- 500 active sellers
- 5,000 registered buyers
- 2,000 orders/month
- 10+ active riders
- 4.0+ Play Store rating

---

## Phase 3 — Scale (Months 7–12)

**Theme**: Market leadership, multi-country, B2B features

### Goals
- [ ] Launch in Kenya (KES) and Tanzania (TZS)
- [ ] iOS app (App Store)
- [ ] Seller subscription tiers (Basic/Pro/Enterprise)
- [ ] B2B bulk ordering
- [ ] Advanced analytics for sellers

### Features
- **Multi-Currency**: KES (Kenya), TZS (Tanzania), UGX (Uganda)
- **Multi-Language**: English + Swahili
- **iOS App**: Flutter universal build for App Store
- **Seller Tiers**:
  - Basic (free): 50 products, standard commission
  - Pro (UGX 150k/mo): Unlimited products, priority listing
  - Enterprise (custom): Dedicated support, custom commission
- **B2B Portal**: Bulk ordering with invoice payment (30-day NET)
- **Analytics Dashboard**: GMV, conversion rates, top products per seller
- **Seller Advertising**: Sponsored product listings (PPC)
- **Return Management**: Buyer return requests, seller approval flow
- **Live Chat**: In-app chat between buyer and seller
- **AI Recommendations**: ML-based product recommendations per user

### Technical Milestones
- [ ] Kubernetes cluster for high availability
- [ ] Multi-region PostgreSQL (read replicas in Kenya/Tanzania)
- [ ] Message queue (BullMQ) for async payment processing
- [ ] GraphQL API layer for mobile apps
- [ ] Fraud detection engine (rule-based + ML)
- [ ] GDPR/Data compliance for international expansion

### KPIs
- 2,000+ active sellers across 3 countries
- 50,000 monthly active buyers
- UGX 500M+ monthly GMV
- 98.5% payment success rate
- < 500ms API p95 response time

---

## Phase 4 — Platform Maturity (Year 2+)

**Theme**: Ecosystem, marketplace dominance, financial services

### Features
- **TotalStore Pay**: Digital wallet for buyers (store credit, cashback)
- **Seller Loans**: Working capital advances based on GMV history
- **Fulfilment Centers**: Warehousing in Kampala, Nairobi, Dar es Salaam
- **Same-Day Delivery**: Express delivery for in-city orders
- **Virtual Try-On**: AR for fashion items (phone camera)
- **Subscription Boxes**: Monthly curated product subscriptions
- **API Marketplace**: Open API for third-party integrations
- **Franchise Model**: Licensed TotalStore hubs in regional cities

---

## Technical Debt & Maintenance Backlog

| Priority | Item | Notes |
|----------|------|-------|
| High | Add comprehensive unit + E2E tests | Jest (API), Playwright (Web), Flutter test |
| High | API versioning (`/api/v1/...`) | Plan before breaking changes |
| High | Implement proper logging aggregation | ELK stack or Loki |
| Medium | Rate limiting per user (not just IP) | Authenticated endpoint abuse |
| Medium | Webhook delivery retries with exponential backoff | Prevent lost payment events |
| Medium | Seller product bulk import (CSV/Excel) | Requested by large sellers |
| Low | Dark mode for web + mobile | UX improvement |
| Low | Offline mode for buyer mobile | Service worker / Flutter Hive cache |

---

## Infrastructure Cost Estimates (Uganda Launch)

| Service | Provider | Monthly Cost (USD) |
|---------|----------|-------------------|
| API Server (2 vCPU, 4GB) | DigitalOcean Droplet | $24 |
| PostgreSQL (Managed) | DigitalOcean DB | $15 |
| Redis (Managed) | DigitalOcean Redis | $15 |
| Cloudinary (Starter) | Cloudinary | $0 (free tier) |
| Africa's Talking SMS | Pay per SMS | ~$0.005/SMS |
| Firebase | Google | $0 (free tier) |
| Domain + SSL | Namecheap + Let's Encrypt | $15/year |
| **Total MVP** | | **~$54/month** |

---

## Team Structure (Recommended)

| Role | Count | Focus |
|------|-------|-------|
| Backend Engineer | 1–2 | NestJS API, payments, WebSocket |
| Frontend Engineer | 1 | Next.js web apps (buyer + admin + seller) |
| Mobile Developer | 1 | Flutter buyer + rider apps |
| Product Manager | 1 | Roadmap, seller/buyer success |
| Operations | 1–2 | Delivery coordination, seller support |
