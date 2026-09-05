-- AlterTable
ALTER TABLE "commerce_settings" ADD COLUMN     "minMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 15,
ADD COLUMN     "targetMarginPct" DOUBLE PRECISION NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "minMarginPct" DOUBLE PRECISION;
