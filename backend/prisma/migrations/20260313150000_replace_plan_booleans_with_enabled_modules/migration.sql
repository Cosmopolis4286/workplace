-- Replace individual module boolean columns with a single enabledModules text array

ALTER TABLE "plans" DROP COLUMN IF EXISTS "hasAnalytics";
ALTER TABLE "plans" DROP COLUMN IF EXISTS "hasDelivery";
ALTER TABLE "plans" DROP COLUMN IF EXISTS "hasReports";
ALTER TABLE "plans" DROP COLUMN IF EXISTS "hasApiAccess";
ALTER TABLE "plans" DROP COLUMN IF EXISTS "hasPrioritySupport";

ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "enabledModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Add allowedModules to user_categories for business-type module filtering
ALTER TABLE "user_categories" ADD COLUMN IF NOT EXISTS "allowedModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
