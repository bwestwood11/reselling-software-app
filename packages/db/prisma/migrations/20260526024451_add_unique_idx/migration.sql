/*
  Warnings:

  - A unique constraint covering the columns `[userId,marketplace,externalId]` on the table `Listing` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "MercariJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "MarketplaceConnection" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "sessionCookies" TEXT;

-- CreateTable
CREATE TABLE "MercariJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "listingId" TEXT,
    "status" "MercariJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MercariJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MercariCategory" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "parentId" TEXT,
    "isLeaf" BOOLEAN NOT NULL DEFAULT false,
    "hasChildren" BOOLEAN NOT NULL DEFAULT false,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "fullPath" TEXT[],
    "isSizeRequired" BOOLEAN NOT NULL DEFAULT false,
    "sizeSchemaId" TEXT,
    "payload" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercariCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_userId_marketplace_externalId_key" ON "Listing"("userId", "marketplace", "externalId");

-- AddForeignKey
ALTER TABLE "MercariJob" ADD CONSTRAINT "MercariJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
