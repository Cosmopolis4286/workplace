-- CreateIndex
CREATE INDEX "identity_verifications_status_createdAt_idx" ON "identity_verifications"("status", "createdAt");
