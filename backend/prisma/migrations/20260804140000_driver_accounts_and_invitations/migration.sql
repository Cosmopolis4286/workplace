-- CreateEnum
CREATE TYPE "DriverInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "graceUntil" TIMESTAMP(3),
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "driver_invitations" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "commerceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "status" "DriverInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "driverId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_invitations_token_key" ON "driver_invitations"("token");

-- CreateIndex
CREATE INDEX "driver_invitations_commerceId_idx" ON "driver_invitations"("commerceId");

-- CreateIndex
CREATE INDEX "driver_invitations_email_idx" ON "driver_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_userId_key" ON "drivers"("userId");

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_invitations" ADD CONSTRAINT "driver_invitations_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "commerces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: drivers creados antes de este cambio no tienen cuenta propia.
-- Se les da un periodo de gracia de 30 días para que el comercio los invite
-- a registrarse; vencido ese plazo dejan de poder recibir nuevas asignaciones
-- (ver chequeo en DeliveryService.assignDriver).
UPDATE "drivers" SET "graceUntil" = NOW() + INTERVAL '30 days' WHERE "userId" IS NULL;
