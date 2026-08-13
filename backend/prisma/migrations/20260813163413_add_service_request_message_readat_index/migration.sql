-- CreateIndex
CREATE INDEX "service_request_messages_serviceRequestId_readAt_idx" ON "service_request_messages"("serviceRequestId", "readAt");
