-- CreateTable
CREATE TABLE "MemberTypeHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "effectiveMonth" TEXT NOT NULL,
    "memberType" "MemberType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberTypeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberTypeHistory_userId_effectiveMonth_idx" ON "MemberTypeHistory"("userId", "effectiveMonth" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MemberTypeHistory_userId_effectiveMonth_key" ON "MemberTypeHistory"("userId", "effectiveMonth");

-- AddForeignKey
ALTER TABLE "MemberTypeHistory" ADD CONSTRAINT "MemberTypeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
