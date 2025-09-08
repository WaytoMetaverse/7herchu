-- AlterEnum
ALTER TYPE "public"."EventType" ADD VALUE 'VISIT';

-- AlterTable
ALTER TABLE "public"."OrgSettings" ADD COLUMN     "invitationCardVisit" TEXT,
ADD COLUMN     "invitationMessageVisit" TEXT DEFAULT '磐石砌好厝誠摯地邀請您一同來參與';
