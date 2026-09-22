-- AlterTable
ALTER TABLE "service_categories" ADD COLUMN     "userCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "job_categories" ADD COLUMN     "userCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
