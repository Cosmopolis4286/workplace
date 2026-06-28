-- CreateEnum
CREATE TYPE "CorridaServiceType" AS ENUM ('PASAJERO', 'FLETE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CorridaVehicleType" ADD VALUE 'CAMIONETA';
ALTER TYPE "CorridaVehicleType" ADD VALUE 'CAMION';

-- AlterTable
ALTER TABLE "corridas" ADD COLUMN     "cargoDescription" TEXT,
ADD COLUMN     "cargoWeight" DOUBLE PRECISION,
ADD COLUMN     "declaredValue" DOUBLE PRECISION,
ADD COLUMN     "recipientName" TEXT,
ADD COLUMN     "recipientPhone" TEXT,
ADD COLUMN     "serviceType" "CorridaServiceType" NOT NULL DEFAULT 'PASAJERO';

-- CreateIndex
CREATE INDEX "corridas_serviceType_idx" ON "corridas"("serviceType");

