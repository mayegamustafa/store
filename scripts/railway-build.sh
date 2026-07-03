#!/usr/bin/env bash
# Builds all four apps for the single-service Railway deployment.
# Root Directory on the Railway service must be the repo root.
#
# NEXT_PUBLIC_* vars are inlined into each Next.js bundle at build time, so
# they are set per-app here rather than as service variables (one service
# can't hold two different NEXT_PUBLIC_BASE_PATH values).
set -euo pipefail

SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://shop.saktech.org}"

echo "==> Building API (NestJS + Prisma)"
(cd apps/api \
  && npm ci --include=dev \
  && npx prisma generate \
  && npm run build)

echo "==> Building web (buyer storefront + gateway)"
(cd apps/web \
  && npm ci --include=dev \
  && NEXT_PUBLIC_API_URL=/api/v1 NEXT_PUBLIC_SITE_URL="$SITE_URL" npm run build)

echo "==> Building admin (basePath /admin)"
(cd apps/admin \
  && npm ci --include=dev \
  && NEXT_PUBLIC_BASE_PATH=/admin NEXT_PUBLIC_API_URL=/api/v1 npm run build)

echo "==> Building seller (basePath /seller)"
(cd apps/seller \
  && npm ci --include=dev \
  && NEXT_PUBLIC_BASE_PATH=/seller NEXT_PUBLIC_API_URL=/api/v1 npm run build)

echo "==> All apps built"
