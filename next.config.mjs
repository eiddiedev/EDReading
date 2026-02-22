/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  // 消除来自局域网 (如 192.168.1.10) 的开发模式跨域警告
  allowedDevOrigins: ["192.168.1.10", "localhost"],
  experimental: {
    // allowedDevOrigins: ["192.168.1.10", "localhost"],
  },
};

export default nextConfig;