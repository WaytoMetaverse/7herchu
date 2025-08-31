-- AlterTable
ALTER TABLE "public"."SpeakerBooking" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'UNPAID';
