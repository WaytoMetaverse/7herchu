-- AlterTable
ALTER TABLE "public"."OrgSettings" ADD COLUMN     "invitationCardSpeaker" TEXT,
ADD COLUMN     "invitationMessageSpeaker" TEXT DEFAULT '磐石砌好厝誠摯地邀請您一同來參與';
