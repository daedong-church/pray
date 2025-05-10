/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/pray',  // 저장소 이름이 'pray'이므로 소문자로 수정
  assetPrefix: '/pray/',
  trailingSlash: true
}

module.exports = nextConfig
