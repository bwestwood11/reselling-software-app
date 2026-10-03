-- Accountability: optional end date. NULL = the task continues indefinitely (every existing task);
-- a YYYY-MM-DD date = the last day it runs (for a weekly goal, the last week is the one containing it).

-- AlterTable
ALTER TABLE "AccountabilityTask" ADD COLUMN "endDate" TEXT;
