-- AlterTable
ALTER TABLE "public"."OrgSettings" ADD COLUMN     "cardSubConstruction" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cardSubDesign" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cardSubDevelopment" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cardSubFinance" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cardSubManagement" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "cardSubMaterials" TEXT[] DEFAULT ARRAY[]::TEXT[];
