/*
  Warnings:

  - The values [STARTER,PRO,PREMIUM] on the enum `PlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PlanType_new" AS ENUM ('FREE', 'SIDE_HUSTLE', 'FULL_TIME', 'ENTERPRISE');
ALTER TABLE "public"."Subscription" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "plan" TYPE "PlanType_new" USING ("plan"::text::"PlanType_new");
ALTER TYPE "PlanType" RENAME TO "PlanType_old";
ALTER TYPE "PlanType_new" RENAME TO "PlanType";
DROP TYPE "public"."PlanType_old";
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'FREE';
COMMIT;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "bgRemovalCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "flatLayCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ghostMannequinCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inventoryCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ironToolCredits" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "plan" SET DEFAULT 'FREE';

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;
