/** @type {import('next').NextConfig} */
const isCloudflare = process.env.CF_PAGES === '1' || process.env.CLOUDFLARE === '1';

const nextConfig = {
  assetPrefix: isCloudflare ? '/assets' : undefined,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'places.googleapis.com', pathname: '/v1/places/**/media**' },
      { protocol: 'https', hostname: 'maps.googleapis.com', pathname: '/maps/api/place/photo/**' },
    ],
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
};

module.exports = nextConfig;
