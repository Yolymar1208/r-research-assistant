/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },
  api: {
    bodyParser: false,
  },
}

module.exports = nextConfig
