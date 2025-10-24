-- AlterTable
ALTER TABLE "public"."OrgSettings" ADD COLUMN     "botRecoveryAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastPrimaryBotError" TIMESTAMP(3),
ADD COLUMN     "primaryBotErrorCount" INTEGER NOT NULL DEFAULT 0;
