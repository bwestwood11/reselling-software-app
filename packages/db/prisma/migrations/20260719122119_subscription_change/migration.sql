/*
  Warnings:

  - You are about to drop the column `bgRemovalCredits` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `credits` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `flatLayCredits` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `ghostMannequinCredits` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `inventoryCredits` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `ironToolCredits` on the `Subscription` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "bgRemovalCredits",
DROP COLUMN "credits",
DROP COLUMN "flatLayCredits",
DROP COLUMN "ghostMannequinCredits",
DROP COLUMN "inventoryCredits",
DROP COLUMN "ironToolCredits",
ADD COLUMN     "aiCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "billingInterval" TEXT,
ADD COLUMN     "bonusAiCredits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trialEndsAt" TIMESTAMP(3);
