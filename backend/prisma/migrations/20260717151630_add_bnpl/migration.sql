-- CreateEnum
CREATE TYPE "BnplProvider" AS ENUM ('CASHEA', 'KRECE');

-- CreateEnum
CREATE TYPE "BnplTransactionStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'EXPIRADA', 'CANCELADA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CASHEA';
ALTER TYPE "PaymentMethod" ADD VALUE 'KRECE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "bnplEligible" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "bnpl_settings" (
    "id" TEXT NOT NULL,
    "commerceId" TEXT NOT NULL,
    "provider" "BnplProvider" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isSimulated" BOOLEAN NOT NULL DEFAULT true,
    "publicApiKeyEnc" TEXT,
    "privateApiKeyEnc" TEXT,
    "storeId" TEXT,
    "storeName" TEXT,
    "externalClientIdEnc" TEXT,
    "extraConfig" JSONB DEFAULT '{}',
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bnpl_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bnpl_transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "commerceId" TEXT NOT NULL,
    "provider" "BnplProvider" NOT NULL,
    "status" "BnplTransactionStatus" NOT NULL DEFAULT 'PENDIENTE',
    "externalReference" TEXT,
    "checkoutUrl" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "installments" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bnpl_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bnpl_settings_commerceId_provider_key" ON "bnpl_settings"("commerceId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "bnpl_transactions_orderId_key" ON "bnpl_transactions"("orderId");

-- CreateIndex
CREATE INDEX "bnpl_transactions_commerceId_idx" ON "bnpl_transactions"("commerceId");

-- CreateIndex
CREATE INDEX "bnpl_transactions_status_idx" ON "bnpl_transactions"("status");

-- CreateIndex
CREATE INDEX "bnpl_transactions_provider_status_idx" ON "bnpl_transactions"("provider", "status");

-- CreateIndex
CREATE INDEX "bnpl_transactions_status_expiresAt_idx" ON "bnpl_transactions"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "bnpl_settings" ADD CONSTRAINT "bnpl_settings_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bnpl_transactions" ADD CONSTRAINT "bnpl_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bnpl_transactions" ADD CONSTRAINT "bnpl_transactions_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

