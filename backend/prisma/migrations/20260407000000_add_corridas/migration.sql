-- CreateEnum
CREATE TYPE "CorridaStatus" AS ENUM ('PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CorridaVehicleType" AS ENUM ('MOTO', 'AUTO');

-- CreateTable
CREATE TABLE "corridas" (
    "id" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "originLat" DOUBLE PRECISION,
    "originLng" DOUBLE PRECISION,
    "destinationLat" DOUBLE PRECISION,
    "destinationLng" DOUBLE PRECISION,
    "status" "CorridaStatus" NOT NULL DEFAULT 'PENDING',
    "vehicleType" "CorridaVehicleType" NOT NULL DEFAULT 'MOTO',
    "price" DOUBLE PRECISION,
    "distance" DOUBLE PRECISION,
    "duration" INTEGER,
    "notes" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "passengerId" TEXT NOT NULL,
    "driverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corridas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "corridas_passengerId_idx" ON "corridas"("passengerId");

-- CreateIndex
CREATE INDEX "corridas_driverId_idx" ON "corridas"("driverId");

-- CreateIndex
CREATE INDEX "corridas_status_idx" ON "corridas"("status");

-- AddForeignKey
ALTER TABLE "corridas" ADD CONSTRAINT "corridas_passengerId_fkey" FOREIGN KEY ("passengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corridas" ADD CONSTRAINT "corridas_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
