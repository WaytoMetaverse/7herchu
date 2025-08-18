-- AlterTable
ALTER TABLE "public"."MemberProfile" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "birthday" TIMESTAMP(3),
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyWebsite" TEXT,
ADD COLUMN     "dietPreference" TEXT,
ADD COLUMN     "occupation" TEXT,
ADD COLUMN     "portfolioPhotos" JSONB,
ADD COLUMN     "workDescription" TEXT,
ADD COLUMN     "workLocation" TEXT;
