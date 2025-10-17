-- CreateEnum
CREATE TYPE "public"."GuestType" AS ENUM ('PANSHI', 'OTHER_BNI', 'NON_BNI');

-- AlterTable
ALTER TABLE "public"."Registration" ADD COLUMN     "guestType" "public"."GuestType";
