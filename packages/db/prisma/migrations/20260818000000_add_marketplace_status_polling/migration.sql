-- Marketplace status polling (Poshmark first): hourly sold-detection sweeps.

CREATE TYPE "MarketplacePollStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

ALTER TABLE "MarketplaceConnection" ADD COLUMN "lastPolledAt" TIMESTAMP(3);

ALTER TABLE "Listing" ADD COLUMN "lastStatusCheckAt" TIMESTAMP(3);
ALTER TABLE "Listing" ADD COLUMN "statusCheckCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "MarketplacePollRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketplace" "MarketplaceType" NOT NULL,
    "status" "MarketplacePollStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "requestedCount" INTEGER NOT NULL DEFAULT 0,
    "checkedCount" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "soldListingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorMessage" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplacePollRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketplacePollRun_userId_marketplace_startedAt_idx" ON "MarketplacePollRun"("userId", "marketplace", "startedAt");

ALTER TABLE "MarketplacePollRun" ADD CONSTRAINT "MarketplacePollRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
