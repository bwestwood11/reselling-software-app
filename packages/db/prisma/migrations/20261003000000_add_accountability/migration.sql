-- Accountability: daily tasks/goals for the seller and the people who help them.
-- Purely additive (new enums + tables). Applied directly with this SQL, not db push.

-- CreateEnum
CREATE TYPE "AccountabilityMetric" AS ENUM ('MANUAL', 'ITEMS_LISTED', 'ITEMS_ADDED', 'ITEMS_SOLD');

-- CreateEnum
CREATE TYPE "AccountabilitySchedule" AS ENUM ('DAILY', 'WEEKDAYS', 'ONCE');

-- CreateTable
CREATE TABLE "AccountabilityPerson" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountabilityPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountabilityTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "personId" TEXT,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "target" INTEGER,
    "metric" "AccountabilityMetric" NOT NULL DEFAULT 'MANUAL',
    "schedule" "AccountabilitySchedule" NOT NULL DEFAULT 'DAILY',
    "startDate" TEXT NOT NULL,
    "onDate" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountabilityTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountabilityCheckin" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountabilityCheckin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccountabilityPerson_userId_idx" ON "AccountabilityPerson"("userId");

-- CreateIndex
CREATE INDEX "AccountabilityTask_userId_idx" ON "AccountabilityTask"("userId");

-- CreateIndex
CREATE INDEX "AccountabilityCheckin_date_idx" ON "AccountabilityCheckin"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AccountabilityCheckin_taskId_date_key" ON "AccountabilityCheckin"("taskId", "date");

-- AddForeignKey
ALTER TABLE "AccountabilityPerson" ADD CONSTRAINT "AccountabilityPerson_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountabilityTask" ADD CONSTRAINT "AccountabilityTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountabilityTask" ADD CONSTRAINT "AccountabilityTask_personId_fkey" FOREIGN KEY ("personId") REFERENCES "AccountabilityPerson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountabilityCheckin" ADD CONSTRAINT "AccountabilityCheckin_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "AccountabilityTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

