-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('GENERAL', 'CLOSED', 'BOD', 'DINNER', 'JOINT');

-- CreateEnum
CREATE TYPE "public"."MemberType" AS ENUM ('SINGLE', 'FIXED');

-- CreateEnum
CREATE TYPE "public"."PricingMode" AS ENUM ('DEFAULT', 'MANUAL_PER_REG');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'MONTHLY_BILL');

-- CreateEnum
CREATE TYPE "public"."RegRole" AS ENUM ('MEMBER', 'GUEST', 'SPEAKER');

-- CreateEnum
CREATE TYPE "public"."BillingType" AS ENUM ('NONE', 'SINGLE_220', 'FIXED_MONTHLY', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."FinanceTxnType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('admin', 'event_manager', 'menu_manager', 'finance_manager', 'checkin_manager');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('TRANSFER', 'LINEPAY');

-- CreateEnum
CREATE TYPE "public"."PaymentPreference" AS ENUM ('BANK_ACCOUNT', 'INVITER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "googleId" TEXT,
    "phone" TEXT,
    "roles" "public"."Role"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MemberProfile" (
    "userId" TEXT NOT NULL,
    "memberType" "public"."MemberType" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MemberProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "public"."MemberInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleHints" "public"."Role"[],
    "memberType" "public"."MemberType",
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "agenda" TEXT,
    "cutoffAt" TIMESTAMP(3),
    "announcementTitle" TEXT,
    "allowSpeakers" BOOLEAN NOT NULL,
    "allowGuests" BOOLEAN NOT NULL,
    "speakerQuota" INTEGER,
    "pricingMode" "public"."PricingMode" NOT NULL DEFAULT 'DEFAULT',
    "guestPriceCents" INTEGER,
    "bodMemberPriceCents" INTEGER,
    "bodGuestPriceCents" INTEGER,
    "defaultPriceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Menu" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MenuItem" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "containsBeef" BOOLEAN NOT NULL DEFAULT false,
    "containsPork" BOOLEAN NOT NULL DEFAULT false,
    "isVegetarian" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SpeakerBooking" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "editPasswordHash" TEXT NOT NULL,
    "diet" TEXT NOT NULL,
    "noBeef" BOOLEAN NOT NULL DEFAULT false,
    "noPork" BOOLEAN NOT NULL DEFAULT false,
    "mealCode" TEXT,
    "pptUrl" TEXT,
    "paymentMethod" TEXT,
    "companyName" TEXT,
    "industry" TEXT,
    "bniChapter" TEXT,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakerBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."GuestInvite" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "invitedBy" TEXT,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Registration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" "public"."RegRole" NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "industry" TEXT,
    "bniChapter" TEXT,
    "invitedBy" TEXT,
    "diet" TEXT,
    "noBeef" BOOLEAN NOT NULL DEFAULT false,
    "noPork" BOOLEAN NOT NULL DEFAULT false,
    "mealCode" TEXT,
    "checkedInAt" TIMESTAMP(3),
    "billingType" "public"."BillingType" NOT NULL DEFAULT 'NONE',
    "priceCents" INTEGER,
    "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" "public"."PaymentMethod",
    "paymentPreference" "public"."PaymentPreference",
    "paymentNote" TEXT,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinanceInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "paidTxnId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinanceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "note" TEXT,

    CONSTRAINT "FinanceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinanceCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."FinanceTxnType" NOT NULL,
    "system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "FinanceCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinanceTransaction" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "public"."FinanceTxnType" NOT NULL,
    "categoryId" TEXT,
    "eventId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "counterparty" TEXT,
    "note" TEXT,
    "paymentMethod" "public"."PaymentMethod",
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrgSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "bankInfo" TEXT NOT NULL,
    "linePayInfo" TEXT,

    CONSTRAINT "OrgSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "public"."User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "public"."User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "MemberInvite_email_key" ON "public"."MemberInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MemberInvite_token_key" ON "public"."MemberInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_month_key" ON "public"."Menu"("month");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakerBooking_eventId_phone_key" ON "public"."SpeakerBooking"("eventId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "GuestInvite_token_key" ON "public"."GuestInvite"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Registration_eventId_phone_key" ON "public"."Registration"("eventId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceInvoice_userId_month_type_key" ON "public"."FinanceInvoice"("userId", "month", "type");

-- AddForeignKey
ALTER TABLE "public"."MemberProfile" ADD CONSTRAINT "MemberProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MenuItem" ADD CONSTRAINT "MenuItem_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "public"."Menu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SpeakerBooking" ADD CONSTRAINT "SpeakerBooking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."GuestInvite" ADD CONSTRAINT "GuestInvite_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Registration" ADD CONSTRAINT "Registration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Registration" ADD CONSTRAINT "Registration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceInvoice" ADD CONSTRAINT "FinanceInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceLineItem" ADD CONSTRAINT "FinanceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."FinanceInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceLineItem" ADD CONSTRAINT "FinanceLineItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."FinanceCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
