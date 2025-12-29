-- CreateEnum
CREATE TYPE "public"."BadgeType" AS ENUM ('GROUP_MEETING', 'CLOSED_MEETING', 'SOFT_ACTIVITY', 'BOD', 'DINNER', 'VISIT', 'JOINT', 'MEAL_SERVICE', 'CHECKIN', 'SPEAKER');

-- CreateEnum
CREATE TYPE "public"."BadgeLevel" AS ENUM ('BRONZE', 'COPPER', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'ELITE');

-- CreateTable
CREATE TABLE "public"."UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeType" "public"."BadgeType" NOT NULL,
    "level" "public"."BadgeLevel" NOT NULL,
    "count" INTEGER NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "public"."UserBadge"("userId");

-- CreateIndex
CREATE INDEX "UserBadge_badgeType_level_idx" ON "public"."UserBadge"("badgeType", "level");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadge_userId_badgeType_level_key" ON "public"."UserBadge"("userId", "badgeType", "level");

-- AddForeignKey
ALTER TABLE "public"."UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
