-- AlterTable
ALTER TABLE "profile_settings" ADD COLUMN     "dashboardQuickActionIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
