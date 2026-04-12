import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/utils", "@repo/types"],
  serverExternalPackages: ["@prisma/client"],
  images: {
    domains: ["res.cloudinary.com", "i.ebayimg.com"],
  },
};

export default nextConfig;
