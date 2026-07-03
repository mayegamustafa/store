/** @type {import('next').NextConfig} */
const nextConfig = {
  // When accessed through the dev proxy at localhost:8080/admin
  // (remove or set to '' for standalone port access: localhost:3002)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    remotePatterns: [
      { protocol: 'http',  hostname: 'localhost',             port: '3001', pathname: '/uploads/**' },
      { protocol: 'http',  hostname: '127.0.0.1',             port: '3001', pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'shop.saktech.org',                       pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'res.cloudinary.com',                  pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com',                 pathname: '/**' },
      { protocol: 'https', hostname: 'via.placeholder.com',                 pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co',                        pathname: '/**' },
      { protocol: 'https', hostname: 'upload.wikimedia.org',                pathname: '/**' },
      { protocol: 'https', hostname: '*.supabase.co',                       pathname: '/**' },
      { protocol: 'https', hostname: '*.totalstore.co.ke',                  pathname: '/**' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
};

module.exports = nextConfig;
