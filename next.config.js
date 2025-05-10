const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
    output: 'export',
    images: { unoptimized: true },
    basePath: '/pray',
    assetPrefix: '/pray/',
    trailingSlash: true,
  }
  module.exports = nextConfig;