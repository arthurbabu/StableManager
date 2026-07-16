/*
  Warnings:

  - You are about to drop the column `nextReminderDate` on the `CareTask` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CareTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "horseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "assignedToId" TEXT,
    "notes" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT,
    "reminderDelayDays" INTEGER,
    CONSTRAINT "CareTask_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CareTask_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CareTask" ("assignedToId", "createdAt", "date", "done", "endTime", "horseId", "id", "location", "notes", "startTime", "type") SELECT "assignedToId", "createdAt", "date", "done", "endTime", "horseId", "id", "location", "notes", "startTime", "type" FROM "CareTask";
DROP TABLE "CareTask";
ALTER TABLE "new_CareTask" RENAME TO "CareTask";
CREATE INDEX "CareTask_date_idx" ON "CareTask"("date");
CREATE INDEX "CareTask_horseId_idx" ON "CareTask"("horseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
