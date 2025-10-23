-- AlterTable
ALTER TABLE "public"."OrgSettings" ADD COLUMN     "currentLineBot" TEXT DEFAULT 'primary',
ADD COLUMN     "lastLineBotSwitch" TIMESTAMP(3),
ADD COLUMN     "lineBotStatus" TEXT DEFAULT 'active';
