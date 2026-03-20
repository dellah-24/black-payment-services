/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Cloudflare Pages configuration
  cloudflare: {
    nodejsCompat: true,
  },
  // Exclude mobile app from Next.js web build
  webpack: (config, { isServer }) => {
    // Ignore react-native related files in web build
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native': false,
    };
    return config;
  },
  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable eslint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
