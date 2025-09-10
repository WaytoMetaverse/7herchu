-- DropIndex
DROP INDEX "public"."BusinessCard_phone_key";

-- CreateIndex
CREATE INDEX "BusinessCard_phone_idx" ON "public"."BusinessCard"("phone");
