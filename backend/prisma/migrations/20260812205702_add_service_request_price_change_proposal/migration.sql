-- CreateEnum
CREATE TYPE "ServiceRequestProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'APPROVED_PENDING_FUNDS', 'REJECTED', 'INVALIDATED');

-- CreateTable
CREATE TABLE "service_request_price_change_proposals" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "status" "ServiceRequestProposalStatus" NOT NULL DEFAULT 'PENDING',
    "previousPrice" DOUBLE PRECISION NOT NULL,
    "proposedPrice" DOUBLE PRECISION NOT NULL,
    "deltaAmount" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "proposedBy" TEXT NOT NULL,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "escrowReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_request_price_change_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_request_proposal_items" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_proposal_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_request_price_change_proposals_serviceRequestId_idx" ON "service_request_price_change_proposals"("serviceRequestId");

-- CreateIndex
CREATE INDEX "service_request_price_change_proposals_status_idx" ON "service_request_price_change_proposals"("status");

-- CreateIndex
CREATE INDEX "service_request_price_change_proposals_createdAt_idx" ON "service_request_price_change_proposals"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "service_request_proposal_items_proposalId_idx" ON "service_request_proposal_items"("proposalId");

-- AddForeignKey
ALTER TABLE "service_request_price_change_proposals" ADD CONSTRAINT "service_request_price_change_proposals_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_request_proposal_items" ADD CONSTRAINT "service_request_proposal_items_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "service_request_price_change_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
