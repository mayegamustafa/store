#!/usr/bin/env bash
# Starts all four apps in one container. The web app listens on Railway's
# injected $PORT and is the only public entrypoint; it proxies /api, /admin
# and /seller to the other three over localhost (see apps/web/next.config.js —
# its upstream defaults are already 127.0.0.1:3001/3002/3003).
set -uo pipefail

PUBLIC_PORT="${PORT:-3000}"

echo "==> Running database migrations"
(cd apps/api && npx prisma migrate deploy) || exit 1

echo "==> Starting API on :3001"
(cd apps/api && PORT=3001 node dist/main) &

echo "==> Starting admin on :3002"
(cd apps/admin && PORT=3002 npx next start -p 3002) &

echo "==> Starting seller on :3003"
(cd apps/seller && PORT=3003 npx next start -p 3003) &

echo "==> Starting web (public) on :${PUBLIC_PORT}"
(cd apps/web \
  && API_UPSTREAM_URL=http://127.0.0.1:3001 \
     ADMIN_UPSTREAM_URL=http://127.0.0.1:3002 \
     SELLER_UPSTREAM_URL=http://127.0.0.1:3003 \
     PORT="$PUBLIC_PORT" npx next start -H :: -p "$PUBLIC_PORT") &

# If any process dies, exit so Railway's restart policy kicks in.
wait -n
echo "!! A process exited — shutting down container for restart"
kill 0
exit 1
