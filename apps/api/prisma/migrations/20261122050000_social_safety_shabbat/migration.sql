-- Workstream D: Croisés zones, introductions expiry, conversation origin/closing, reports, Shabbat mode.
-- AlterTable
ALTER TABLE "Introduction" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "introductionId" TEXT,
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'other';

-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "context" TEXT NOT NULL DEFAULT 'profile',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'open';

-- CreateTable
CREATE TABLE "SensitiveZone" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "cell" geography(Point,4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SensitiveZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShabbatSettings" (
    "userId" TEXT NOT NULL,
    "includeHolidays" BOOLEAN NOT NULL DEFAULT true,
    "candleLightingMins" INTEGER NOT NULL DEFAULT 18,
    "havdalahMins" INTEGER,

    CONSTRAINT "ShabbatSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "SensitiveZone_userId_idx" ON "SensitiveZone"("userId");

-- CreateIndex
CREATE INDEX "Introduction_personAId_status_idx" ON "Introduction"("personAId", "status");

-- CreateIndex
CREATE INDEX "Introduction_personBId_status_idx" ON "Introduction"("personBId", "status");

-- CreateIndex
CREATE INDEX "Introduction_introducerId_idx" ON "Introduction"("introducerId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_introductionId_key" ON "Conversation"("introductionId");

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "SensitiveZone" ADD CONSTRAINT "SensitiveZone_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShabbatSettings" ADD CONSTRAINT "ShabbatSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Spatial index for sensitive-zone exclusion (ST_DWithin on geography).
CREATE INDEX "SensitiveZone_cell_gist" ON "SensitiveZone" USING GIST ("cell");
