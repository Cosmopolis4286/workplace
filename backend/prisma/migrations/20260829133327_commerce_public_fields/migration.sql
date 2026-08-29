-- AlterTable
ALTER TABLE "commerces" ADD COLUMN     "description" TEXT,
ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "socialLinks" JSONB;
