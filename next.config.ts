import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 產出 standalone 以利 Docker/Railway 部署
  output: "standalone",
  headers: async () => {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
          { key: "Surrogate-Control", value: "no-store" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
