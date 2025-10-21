/** @type {import('next').NextConfig} */
const nextConfig = {
  // Important: Cloudflare uses edge runtime
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'places.googleapis.com', pathname: '/v1/places/**/media**' },
      { protocol: 'https', hostname: 'maps.googleapis.com', pathname: '/maps/api/place/photo/**' },
    ],
    // Cloudflare needs this for image optimization
    unoptimized: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      },
    ];
  },
  // Cloudflare edge compatibility
  experimental: {
    runtime: 'experimental-edge',
  },
};

module.exports = nextConfig;