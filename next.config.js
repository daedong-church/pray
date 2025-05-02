/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/pray',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
}

module.exports = nextConfig 