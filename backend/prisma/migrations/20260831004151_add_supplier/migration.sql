-- Esta migración se generó contra una base de desarrollo que ya tenía las
-- columnas de tracking de 20260831033946_add_express_tracking (posterior).
-- Los DROP son IF EXISTS para que una base nueva pueda aplicar la cadena
-- completa; en las bases donde ya se aplicó el resultado es el mismo.

-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "deliveries" DROP CONSTRAINT IF EXISTS "deliveries_customerUserId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "deliveries_customerUserId_idx";

-- AlterTable
ALTER TABLE "deliveries" DROP COLUMN IF EXISTS "customerUserId",
DROP COLUMN IF EXISTS "destLat",
DROP COLUMN IF EXISTS "destLng",
DROP COLUMN IF EXISTS "pickupLat",
DROP COLUMN IF EXISTS "pickupLng",
DROP COLUMN IF EXISTS "trackingActive";

-- AlterTable
ALTER TABLE "drivers" DROP COLUMN IF EXISTS "currentHeading",
DROP COLUMN IF EXISTS "currentLat",
DROP COLUMN IF EXISTS "currentLng",
DROP COLUMN IF EXISTS "currentSpeed",
DROP COLUMN IF EXISTS "locationUpdatedAt";

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "commerceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_commerceId_idx" ON "suppliers"("commerceId");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_name_commerceId_key" ON "suppliers"("name", "commerceId");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "commerces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

