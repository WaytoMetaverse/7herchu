-- AlterTable
ALTER TABLE "public"."BusinessCard" ADD COLUMN     "subcategories" TEXT[] DEFAULT ARRAY[]::TEXT[];
