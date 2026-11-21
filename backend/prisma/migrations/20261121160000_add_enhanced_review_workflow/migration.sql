-- CreateEnum
CREATE TYPE "EnhancedReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REVOKED');

-- CreateTable
CREATE TABLE "enhanced_review_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "EnhancedReviewStatus" NOT NULL DEFAULT 'PENDING',
    "requestReason" TEXT NOT NULL,
    "decisionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enhanced_review_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enhanced_review_requests_userId_key" ON "enhanced_review_requests"("userId");

-- CreateIndex
CREATE INDEX "enhanced_review_requests_status_createdAt_idx" ON "enhanced_review_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "enhanced_review_requests_expiresAt_idx" ON "enhanced_review_requests"("expiresAt");

-- AddForeignKey
ALTER TABLE "enhanced_review_requests" ADD CONSTRAINT "enhanced_review_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
