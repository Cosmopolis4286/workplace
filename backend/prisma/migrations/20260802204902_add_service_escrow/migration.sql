-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('NONE', 'HELD', 'PENDING_FUNDS', 'RELEASED', 'REFUNDED');

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "escrowAmount" DOUBLE PRECISION,
ADD COLUMN     "escrowHeldAt" TIMESTAMP(3),
ADD COLUMN     "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "hasEscrow" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "service_requests_escrowStatus_idx" ON "service_requests"("escrowStatus");
