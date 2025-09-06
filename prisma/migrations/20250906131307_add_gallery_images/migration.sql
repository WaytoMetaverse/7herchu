-- AlterTable
ALTER TABLE "public"."OrgSettings" ADD COLUMN     "desktopGalleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mobileGalleryImages" TEXT[] DEFAULT ARRAY[]::TEXT[];
