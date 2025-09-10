/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `BusinessCard` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."BusinessCard" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCard_phone_key" ON "public"."BusinessCard"("phone");
