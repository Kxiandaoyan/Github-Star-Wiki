import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 禁用 Next.js 开发工具栏
  devIndicators: false,
  allowedDevOrigins: ["github-wiki.com", "www.github-wiki.com"],
};

export default nextConfig;
