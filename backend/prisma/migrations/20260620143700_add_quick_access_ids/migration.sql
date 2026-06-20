-- AlterTable
ALTER TABLE "profile_settings" ADD COLUMN     "quickAccessIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
