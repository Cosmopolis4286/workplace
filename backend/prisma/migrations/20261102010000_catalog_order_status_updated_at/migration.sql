-- AlterTable
ALTER TABLE "catalog_orders" ADD COLUMN "statusUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "catalog_orders_escrowStatus_status_idx" ON "catalog_orders"("escrowStatus", "status");
