-- CreateIndex
CREATE INDEX "service_requests_status_reminderSentAt_createdAt_idx" ON "service_requests"("status", "reminderSentAt", "createdAt");

-- CreateIndex
CREATE INDEX "service_requests_providerId_status_idx" ON "service_requests"("providerId", "status");

-- CreateIndex
CREATE INDEX "service_requests_serviceId_providerId_status_idx" ON "service_requests"("serviceId", "providerId", "status");

