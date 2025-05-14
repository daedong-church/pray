const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
    output: 'export',
    images: { unoptimized: true },
    basePath: isProd ? '/pray' : '',
    assetPrefix: isProd ? '/pray/' : '',
    trailingSlash: true,
}

module.exports = nextConfig;