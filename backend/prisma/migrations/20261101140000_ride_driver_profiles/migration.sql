-- CreateEnum
CREATE TYPE "RideDriverProfileStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "deliveryCode" TEXT;

-- CreateTable
CREATE TABLE "ride_driver_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleType" "RideVehicleType" NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "vehicleModel" TEXT NOT NULL,
    "vehicleColor" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "status" "RideDriverProfileStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ride_driver_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ride_driver_profiles_userId_key" ON "ride_driver_profiles"("userId");

-- CreateIndex
CREATE INDEX "ride_driver_profiles_status_idx" ON "ride_driver_profiles"("status");

-- AddForeignKey
ALTER TABLE "ride_driver_profiles" ADD CONSTRAINT "ride_driver_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

