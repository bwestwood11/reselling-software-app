import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/utils", "@repo/types", "@repo/db"],
  serverExternalPackages: ["@prisma/client", "pg", "@prisma/adapter-pg"],
  images: {
    domains: ["res.cloudinary.com", "i.ebayimg.com"],
  },
};

export default nextConfig;
