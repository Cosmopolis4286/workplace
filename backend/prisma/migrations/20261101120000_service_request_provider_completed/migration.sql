-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "providerCompletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "service_requests_status_providerCompletedAt_idx" ON "service_requests"("status", "providerCompletedAt");

