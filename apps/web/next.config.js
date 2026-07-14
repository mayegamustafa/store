/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost',          port: '3001', pathname: '/uploads/**' },
      { protocol: 'http',  hostname: '127.0.0.1',          port: '3001', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'totalstoreug.com',                   pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com',               pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com',              pathname: '/**' },
      { protocol: 'https', hostname: 'via.placeholder.com',              pathname: '/**' },
      { protocol: 'https', hostname: '*.supabase.co',                    pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co',                     pathname: '/**' },
      // production host – change to your actual domain before deploying
      { protocol: 'https', hostname: '*.totalstore.co.ke',               pathname: '/**' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    // Empty = same origin (the gateway proxies /socket.io); set only for split deployments
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || '',
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
  },
  async rewrites() {
    // Upstream URLs. In local dev they point at each app's own port. On
    // Railway (or any container platform) set them to internal service URLs:
    //   API_UPSTREAM_URL    = http://${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}
    //   ADMIN_UPSTREAM_URL  = http://${{admin.RAILWAY_PRIVATE_DOMAIN}}:${{admin.PORT}}
    //   SELLER_UPSTREAM_URL = http://${{seller.RAILWAY_PRIVATE_DOMAIN}}:${{seller.PORT}}
    // With those set, saktech.org/ hits the buyer web and /admin, /seller,
    // /api are transparently forwarded — one domain, path routing, no nginx.
    const api    = process.env.API_UPSTREAM_URL    || 'http://127.0.0.1:3001';
    const admin  = process.env.ADMIN_UPSTREAM_URL  || 'http://127.0.0.1:3002';
    const seller = process.env.SELLER_UPSTREAM_URL || 'http://127.0.0.1:3003';
    return {
      beforeFiles: [
        {
          source: '/admin/:path*',
          destination: `${admin}/admin/:path*`,
        },
      ],
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${api}/api/:path*`,
        },
        {
          // Socket.io handshake + HTTP long-polling. Next's rewrite proxy
          // cannot forward WebSocket upgrades, so clients must include the
          // 'polling' transport — websocket-only sockets can never connect
          // through this gateway.
          //
          // Next 308-redirects '/socket.io/' to '/socket.io' (trailing-slash
          // normalization) BEFORE rewrites run, so the bare path must be
          // matched and the destination must restore the trailing slash —
          // engine.io's path check requires it.
          source: '/socket.io',
          destination: `${api}/socket.io/`,
        },
        {
          source: '/socket.io/:path*',
          destination: `${api}/socket.io/:path*`,
        },
        {
          source: '/uploads/:path*',
          destination: `${api}/uploads/:path*`,
        },
        {
          source: '/tracking/:path*',
          destination: `${api}/tracking/:path*`,
        },
      ],
      fallback: [
        {
          source: '/seller/:path*',
          destination: `${seller}/seller/:path*`,
        },
      ],
    };
  },
};

module.exports = nextConfig;
