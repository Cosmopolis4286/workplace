-- CreateEnum
CREATE TYPE "CatalogDeliveryType" AS ENUM ('DOMICILIO', 'RECOGER', 'DIGITAL');

-- CreateEnum
CREATE TYPE "CatalogOrderStatus" AS ENUM ('PENDIENTE', 'VISTO', 'CONTACTADO', 'CERRADO');

-- CreateTable
CREATE TABLE "catalog_orders" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "restaurantName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "deliveryType" "CatalogDeliveryType" NOT NULL DEFAULT 'DOMICILIO',
    "address" TEXT,
    "city" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "buyerEmail" TEXT,
    "notes" TEXT,
    "totalEstimate" DOUBLE PRECISION,
    "status" "CatalogOrderStatus" NOT NULL DEFAULT 'PENDIENTE',
    "requesterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_orders_restaurantId_idx" ON "catalog_orders"("restaurantId");

-- CreateIndex
CREATE INDEX "catalog_orders_status_idx" ON "catalog_orders"("status");

-- CreateIndex
CREATE INDEX "catalog_orders_createdAt_idx" ON "catalog_orders"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "catalog_orders" ADD CONSTRAINT "catalog_orders_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
