import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/utils", "@repo/types"],
  images: {
    domains: ["res.cloudinary.com", "i.ebayimg.com"],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;
