-- AlterTable
ALTER TABLE "public"."PushSubscription" ADD COLUMN     "notifyEventReminder" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyNoResponse" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyOnRegistration" BOOLEAN NOT NULL DEFAULT true;
