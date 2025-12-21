import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/dashboard",
        destination: "/app/dashboard",
      },
      {
        source: "/dashboard/:path*",
        destination: "/app/dashboard/:path*",
      },
    ];
  },
};

export default nextConfig;
