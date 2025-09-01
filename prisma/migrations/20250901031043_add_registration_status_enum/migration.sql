/*
  Warnings:

  - The `status` column on the `Registration` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `LeaveRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."RegistrationStatus" AS ENUM ('REGISTERED', 'LEAVE');

-- DropForeignKey
ALTER TABLE "public"."LeaveRecord" DROP CONSTRAINT "LeaveRecord_eventId_fkey";

-- AlterTable
ALTER TABLE "public"."Registration" DROP COLUMN "status",
ADD COLUMN     "status" "public"."RegistrationStatus" NOT NULL DEFAULT 'REGISTERED';

-- DropTable
DROP TABLE "public"."LeaveRecord";
