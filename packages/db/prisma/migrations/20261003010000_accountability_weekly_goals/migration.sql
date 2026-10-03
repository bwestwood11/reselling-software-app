-- Accountability: weekly goals. A WEEKLY task has one target per Monday–Sunday week, and each
-- day logs its own count toward it. Additive: existing tasks default to DAILY.

-- CreateEnum
CREATE TYPE "AccountabilityPeriod" AS ENUM ('DAILY', 'WEEKLY');

-- AlterTable
ALTER TABLE "AccountabilityTask" ADD COLUMN "period" "AccountabilityPeriod" NOT NULL DEFAULT 'DAILY';
