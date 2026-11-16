-- Amplía el ciclo operativo de las contrataciones de servicios.
ALTER TYPE "ServiceRequestStatus" ADD VALUE IF NOT EXISTS 'SCHEDULED';
ALTER TYPE "ServiceRequestStatus" ADD VALUE IF NOT EXISTS 'PREPARING';
ALTER TYPE "ServiceRequestStatus" ADD VALUE IF NOT EXISTS 'ON_THE_WAY';
ALTER TYPE "ServiceRequestStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "ServiceRequestStatus" ADD VALUE IF NOT EXISTS 'PAUSED';
ALTER TYPE "ServiceRequestStatus" ADD VALUE IF NOT EXISTS 'AWAITING_DELIVERY';
ALTER TYPE "ServiceRequestStatus" ADD VALUE IF NOT EXISTS 'COMPLETION_PENDING';

ALTER TABLE "service_requests"
  ADD COLUMN "requesterCompletedAt" TIMESTAMP(3),
  ADD COLUMN "completionDeadlineAt" TIMESTAMP(3),
  ADD COLUMN "estimatedStartAt" TIMESTAMP(3),
  ADD COLUMN "estimatedCompletionAt" TIMESTAMP(3);

ALTER TABLE "service_request_status_history"
  ADD COLUMN "reason" TEXT;

CREATE TABLE "service_request_eta_history" (
  "id" TEXT NOT NULL,
  "serviceRequestId" TEXT NOT NULL,
  "previousEstimatedStartAt" TIMESTAMP(3),
  "newEstimatedStartAt" TIMESTAMP(3),
  "previousEstimatedCompletionAt" TIMESTAMP(3),
  "newEstimatedCompletionAt" TIMESTAMP(3),
  "reason" TEXT,
  "changedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "service_request_eta_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_request_eta_history_serviceRequestId_createdAt_idx"
  ON "service_request_eta_history"("serviceRequestId", "createdAt" DESC);
CREATE INDEX "service_requests_status_completionDeadlineAt_idx"
  ON "service_requests"("status", "completionDeadlineAt");
CREATE INDEX "service_requests_estimatedCompletionAt_idx"
  ON "service_requests"("estimatedCompletionAt");

ALTER TABLE "service_request_eta_history"
  ADD CONSTRAINT "service_request_eta_history_serviceRequestId_fkey"
  FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
