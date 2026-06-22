-- CreateTable
CREATE TABLE "product_stock_snapshots" (
    "id" TEXT NOT NULL,
    "commerceId" TEXT NOT NULL,
    "lowStockCount" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_stock_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_stock_snapshots_commerceId_date_idx" ON "product_stock_snapshots"("commerceId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "product_stock_snapshots_commerceId_date_key" ON "product_stock_snapshots"("commerceId", "date");

-- AddForeignKey
ALTER TABLE "product_stock_snapshots" ADD CONSTRAINT "product_stock_snapshots_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
