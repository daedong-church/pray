/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/Pray', // GitHub 저장소 이름으로 설정
  assetPrefix: '/Pray/',
  trailingSlash: true
}

module.exports = nextConfig
