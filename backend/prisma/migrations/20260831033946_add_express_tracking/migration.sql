-- AlterTable: última posición GPS conocida del driver (no histórico)
ALTER TABLE "drivers" ADD COLUMN     "currentLat" DOUBLE PRECISION,
ADD COLUMN     "currentLng" DOUBLE PRECISION,
ADD COLUMN     "currentHeading" DOUBLE PRECISION,
ADD COLUMN     "currentSpeed" DOUBLE PRECISION,
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3);

-- AlterTable: vínculo a cliente autenticado, coordenadas y flag de tracking activo
ALTER TABLE "deliveries" ADD COLUMN     "customerUserId" TEXT,
ADD COLUMN     "pickupLat" DOUBLE PRECISION,
ADD COLUMN     "pickupLng" DOUBLE PRECISION,
ADD COLUMN     "destLat" DOUBLE PRECISION,
ADD COLUMN     "destLng" DOUBLE PRECISION,
ADD COLUMN     "trackingActive" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "deliveries_customerUserId_idx" ON "deliveries"("customerUserId");

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_customerUserId_fkey" FOREIGN KEY ("customerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
