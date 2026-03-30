-- AlterTable
ALTER TABLE "plans" ADD COLUMN     "forNormal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
