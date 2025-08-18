-- CreateEnum
CREATE TYPE "public"."CardCategory" AS ENUM ('FINANCE', 'DEVELOPMENT', 'DESIGN', 'CONSTRUCTION', 'MATERIALS', 'MANAGEMENT');

-- CreateTable
CREATE TABLE "public"."BusinessCard" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "imageUrl" TEXT,
    "category" "public"."CardCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessCard_ownerId_category_idx" ON "public"."BusinessCard"("ownerId", "category");

-- CreateIndex
CREATE INDEX "BusinessCard_name_idx" ON "public"."BusinessCard"("name");

-- AddForeignKey
ALTER TABLE "public"."BusinessCard" ADD CONSTRAINT "BusinessCard_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
