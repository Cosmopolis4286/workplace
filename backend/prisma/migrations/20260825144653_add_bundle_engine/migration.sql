/*
  Warnings:

  - You are about to drop the column `productId` on the `catalog_orders` table. All the data in the column will be lost.
  - You are about to drop the column `productName` on the `catalog_orders` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `catalog_orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "catalog_orders" DROP COLUMN "productId",
DROP COLUMN "productName",
DROP COLUMN "quantity";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "isBundle" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "product_bundle_items" (
    "id" TEXT NOT NULL,
    "bundleProductId" TEXT NOT NULL,
    "componentProductId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "product_bundle_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "catalog_order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isBundle" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "catalog_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_bundle_items_componentProductId_idx" ON "product_bundle_items"("componentProductId");

-- CreateIndex
CREATE UNIQUE INDEX "product_bundle_items_bundleProductId_componentProductId_key" ON "product_bundle_items"("bundleProductId", "componentProductId");

-- CreateIndex
CREATE INDEX "catalog_order_items_orderId_idx" ON "catalog_order_items"("orderId");

-- CreateIndex
CREATE INDEX "catalog_order_items_productId_idx" ON "catalog_order_items"("productId");

-- AddForeignKey
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_bundleProductId_fkey" FOREIGN KEY ("bundleProductId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_bundle_items" ADD CONSTRAINT "product_bundle_items_componentProductId_fkey" FOREIGN KEY ("componentProductId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_order_items" ADD CONSTRAINT "catalog_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "catalog_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
