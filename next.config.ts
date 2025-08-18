import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 產出 standalone 以利 Docker/Railway 部署
  output: "standalone",
};

export default nextConfig;
