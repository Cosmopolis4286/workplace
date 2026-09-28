-- CreateEnum
CREATE TYPE "EscrowDisputeRaisedByRole" AS ENUM ('PAYER', 'PAYEE');

-- CreateEnum
CREATE TYPE "EscrowDisputeStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "EscrowDisputeResolution" AS ENUM ('RELEASE_FULL', 'REFUND_FULL', 'SPLIT');

-- AlterEnum
ALTER TYPE "EscrowStatus" ADD VALUE 'DISPUTED';

-- CreateTable
CREATE TABLE "escrow_disputes" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "raisedByRole" "EscrowDisputeRaisedByRole" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "EscrowDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" "EscrowDisputeResolution",
    "releaseAmount" DOUBLE PRECISION,
    "refundAmount" DOUBLE PRECISION,
    "resolutionNote" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrow_disputes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "escrow_disputes_escrowId_idx" ON "escrow_disputes"("escrowId");

-- CreateIndex
CREATE INDEX "escrow_disputes_status_idx" ON "escrow_disputes"("status");

-- AddForeignKey
ALTER TABLE "escrow_disputes" ADD CONSTRAINT "escrow_disputes_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "escrows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

