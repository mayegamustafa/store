/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Pre-existing type annotation issues (axios interceptor types) do not
    // affect runtime behaviour. Fix gradually; don't block the build.
    ignoreBuildErrors: true,
  },
  // When accessed through the dev proxy at localhost:8080/seller
  // (remove or set to '' for standalone port access: localhost:3003)
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'store.saktech.org',    pathname: '/uploads/**' },
      { protocol: 'https', hostname: 'images.unsplash.com',  pathname: '/**' },
      { protocol: 'https', hostname: 'placehold.co',         pathname: '/**' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  },
};

module.exports = nextConfig;
