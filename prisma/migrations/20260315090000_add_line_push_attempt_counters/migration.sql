-- AlterTable
ALTER TABLE "OrgSettings"
ADD COLUMN "linePushAttemptCountPrimary" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "linePushAttemptCountBackup" INTEGER NOT NULL DEFAULT 0;
