-- CreateEnum
CREATE TYPE "EscrowEntityType" AS ENUM ('SERVICE_REQUEST', 'CATALOG_ORDER');

-- AlterEnum
ALTER TYPE "CatalogOrderStatus" ADD VALUE 'CANCELLED';

-- AlterEnum
ALTER TYPE "FeeTransactionType" ADD VALUE 'CATALOG_ORDER';

-- AlterTable
ALTER TABLE "catalog_orders" ADD COLUMN     "escrowAmount" DOUBLE PRECISION,
ADD COLUMN     "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "platformFeeAmount" DOUBLE PRECISION,
ADD COLUMN     "platformFeeRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "commerce_settings" ADD COLUMN     "requiresEscrowForCatalogOrders" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "escrows" (
    "id" TEXT NOT NULL,
    "entityType" "EscrowEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "payeeId" TEXT NOT NULL,
    "status" "EscrowStatus" NOT NULL DEFAULT 'NONE',
    "amount" DOUBLE PRECISION NOT NULL,
    "heldAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "escrows_status_idx" ON "escrows"("status");

-- CreateIndex
CREATE INDEX "escrows_payerId_idx" ON "escrows"("payerId");

-- CreateIndex
CREATE INDEX "escrows_payeeId_idx" ON "escrows"("payeeId");

-- CreateIndex
CREATE UNIQUE INDEX "escrows_entityType_entityId_key" ON "escrows"("entityType", "entityId");

