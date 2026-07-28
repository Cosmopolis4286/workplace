-- AlterTable
ALTER TABLE "products" ADD COLUMN     "salesCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "restaurants" ADD COLUMN     "avgRating" DOUBLE PRECISION,
ADD COLUMN     "reviewsCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "products_status_forSale_salesCount_idx" ON "products"("status", "forSale", "salesCount");

-- CreateIndex
CREATE INDEX "restaurants_avgRating_idx" ON "restaurants"("avgRating");
