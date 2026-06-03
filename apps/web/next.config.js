/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost',          port: '3001', pathname: '/uploads/**' },
      { protocol: 'http',  hostname: '127.0.0.1',          port: '3001', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'store.saktech.org',                  pathname: '/uploads/**' },
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
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    NEXT_PUBLIC_GOOGLE_MAPS_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Admin dashboard (port 3002) – no conflicting routes in web app
        {
          source: '/admin/:path*',
          destination: 'http://127.0.0.1:3002/admin/:path*',
        },
      ],
      afterFiles: [
        // API proxy
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:3001/api/:path*',
        },
        {
          source: '/uploads/:path*',
          destination: 'http://127.0.0.1:3001/uploads/:path*',
        },
        {
          source: '/tracking/:path*',
          destination: 'http://127.0.0.1:3001/tracking/:path*',
        },
      ],
      fallback: [
        // Seller dashboard (port 3003) – fallback so web's /seller landing pages still work
        {
          source: '/seller/:path*',
          destination: 'http://127.0.0.1:3003/seller/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;
