/*
  Warnings:

  - You are about to drop the `Menu` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MenuItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."MenuItem" DROP CONSTRAINT "MenuItem_menuId_fkey";

-- DropTable
DROP TABLE "public"."Menu";

-- DropTable
DROP TABLE "public"."MenuItem";

-- CreateTable
CREATE TABLE "public"."EventMenu" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "hasMealService" BOOLEAN NOT NULL DEFAULT false,
    "allowMealChoice" BOOLEAN NOT NULL DEFAULT true,
    "mealCodeA" TEXT,
    "mealCodeB" TEXT,
    "mealCodeC" TEXT,
    "mealAHasBeef" BOOLEAN NOT NULL DEFAULT false,
    "mealAHasPork" BOOLEAN NOT NULL DEFAULT false,
    "mealBHasBeef" BOOLEAN NOT NULL DEFAULT false,
    "mealBHasPork" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LeaveRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "leaveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventMenu_eventId_key" ON "public"."EventMenu"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRecord_eventId_userName_key" ON "public"."LeaveRecord"("eventId", "userName");

-- AddForeignKey
ALTER TABLE "public"."EventMenu" ADD CONSTRAINT "EventMenu_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LeaveRecord" ADD CONSTRAINT "LeaveRecord_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
