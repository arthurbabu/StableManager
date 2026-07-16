-- AlterTable
ALTER TABLE "CareTask" ADD COLUMN "location" TEXT;
ALTER TABLE "CareTask" ADD COLUMN "nextReminderDate" DATETIME;

-- AlterTable
ALTER TABLE "Horse" ADD COLUMN "ownerContact" TEXT;
ALTER TABLE "Horse" ADD COLUMN "ownerName" TEXT;
ALTER TABLE "Horse" ADD COLUMN "sireNumber" TEXT;
ALTER TABLE "Horse" ADD COLUMN "transponderNumber" TEXT;
