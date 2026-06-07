/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  // Suppress punycode deprecation warning
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      punycode: false,
    }
    return config
  },
}

export default nextConfig
