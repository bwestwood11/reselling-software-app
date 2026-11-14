-- Residential proxy metering: bytes/requests/cross-posts per user, marketplace and month (UTC).

-- CreateTable
CREATE TABLE "ProxyUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketplace" "MarketplaceType" NOT NULL,
    "month" TEXT NOT NULL,
    "bytes" BIGINT NOT NULL DEFAULT 0,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "crossPosts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProxyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProxyUsage_userId_marketplace_month_key" ON "ProxyUsage"("userId", "marketplace", "month");

-- CreateIndex
CREATE INDEX "ProxyUsage_month_idx" ON "ProxyUsage"("month");

-- AddForeignKey
ALTER TABLE "ProxyUsage" ADD CONSTRAINT "ProxyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
