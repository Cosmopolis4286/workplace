-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- DropForeignKey
ALTER TABLE "deliveries" DROP CONSTRAINT "deliveries_customerUserId_fkey";

-- DropIndex
DROP INDEX "deliveries_customerUserId_idx";

-- AlterTable
ALTER TABLE "deliveries" DROP COLUMN "customerUserId",
DROP COLUMN "destLat",
DROP COLUMN "destLng",
DROP COLUMN "pickupLat",
DROP COLUMN "pickupLng",
DROP COLUMN "trackingActive";

-- AlterTable
ALTER TABLE "drivers" DROP COLUMN "currentHeading",
DROP COLUMN "currentLat",
DROP COLUMN "currentLng",
DROP COLUMN "currentSpeed",
DROP COLUMN "locationUpdatedAt";

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

