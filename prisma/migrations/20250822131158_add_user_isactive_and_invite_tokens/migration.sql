-- AlterTable
ALTER TABLE "public"."FinanceTransaction" ADD COLUMN     "monthlyPaymentId" TEXT;

-- AlterTable
ALTER TABLE "public"."MemberProfile" ADD COLUMN     "businessCards" JSONB;

-- AlterTable
ALTER TABLE "public"."OrgSettings" ADD COLUMN     "invitationCardUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "nickname" TEXT;

-- CreateTable
CREATE TABLE "public"."InviteToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MemberMonthlyPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberMonthlyPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteToken_token_key" ON "public"."InviteToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "MemberMonthlyPayment_userId_month_key" ON "public"."MemberMonthlyPayment"("userId", "month");

-- AddForeignKey
ALTER TABLE "public"."InviteToken" ADD CONSTRAINT "InviteToken_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_monthlyPaymentId_fkey" FOREIGN KEY ("monthlyPaymentId") REFERENCES "public"."MemberMonthlyPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MemberMonthlyPayment" ADD CONSTRAINT "MemberMonthlyPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
