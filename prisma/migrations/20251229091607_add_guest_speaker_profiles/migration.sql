-- AlterTable
ALTER TABLE "public"."Event" ADD COLUMN     "speakersGuestsSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."SpeakerBooking" ADD COLUMN     "guestType" "public"."GuestType";

-- CreateTable
CREATE TABLE "public"."GuestSpeakerProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyName" TEXT,
    "industry" TEXT,
    "guestType" "public"."GuestType",
    "bniChapter" TEXT,
    "invitedBy" TEXT,
    "role" TEXT NOT NULL,
    "lastEventDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestSpeakerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuestSpeakerNote" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "content" VARCHAR(100) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuestSpeakerNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuestSpeakerProfile_phone_idx" ON "public"."GuestSpeakerProfile"("phone");

-- CreateIndex
CREATE INDEX "GuestSpeakerProfile_name_idx" ON "public"."GuestSpeakerProfile"("name");

-- CreateIndex
CREATE INDEX "GuestSpeakerProfile_guestType_idx" ON "public"."GuestSpeakerProfile"("guestType");

-- CreateIndex
CREATE INDEX "GuestSpeakerProfile_lastEventDate_idx" ON "public"."GuestSpeakerProfile"("lastEventDate");

-- CreateIndex
CREATE UNIQUE INDEX "GuestSpeakerProfile_phone_name_key" ON "public"."GuestSpeakerProfile"("phone", "name");

-- CreateIndex
CREATE INDEX "GuestSpeakerNote_profileId_idx" ON "public"."GuestSpeakerNote"("profileId");

-- CreateIndex
CREATE INDEX "GuestSpeakerNote_createdAt_idx" ON "public"."GuestSpeakerNote"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."GuestSpeakerNote" ADD CONSTRAINT "GuestSpeakerNote_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."GuestSpeakerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuestSpeakerNote" ADD CONSTRAINT "GuestSpeakerNote_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
