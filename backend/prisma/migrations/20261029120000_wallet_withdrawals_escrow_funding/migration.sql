-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "wallet_withdrawal_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "destination" JSONB NOT NULL,
    "payoutCurrency" TEXT NOT NULL,
    "payoutAmount" DECIMAL(20,2) NOT NULL,
    "exchangeRate" DECIMAL(20,8),
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "payoutReference" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow_funding_reports" (
    "id" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "payerUserId" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "platformAccountId" TEXT,
    "destination" JSONB NOT NULL,
    "reference" TEXT NOT NULL,
    "payerBankCode" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paidCurrency" TEXT NOT NULL,
    "paidAmount" DECIMAL(20,2) NOT NULL,
    "exchangeRate" DECIMAL(20,8),
    "status" "ManualPaymentReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escrow_funding_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_withdrawal_requests_status_createdAt_idx" ON "wallet_withdrawal_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_withdrawal_requests_userId_createdAt_idx" ON "wallet_withdrawal_requests"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "escrow_funding_reports_status_createdAt_idx" ON "escrow_funding_reports"("status", "createdAt");

-- CreateIndex
CREATE INDEX "escrow_funding_reports_sourceType_sourceId_idx" ON "escrow_funding_reports"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "escrow_funding_reports_reference_idx" ON "escrow_funding_reports"("reference");

-- AddForeignKey
ALTER TABLE "wallet_withdrawal_requests" ADD CONSTRAINT "wallet_withdrawal_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_funding_reports" ADD CONSTRAINT "escrow_funding_reports_payerUserId_fkey" FOREIGN KEY ("payerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow_funding_reports" ADD CONSTRAINT "escrow_funding_reports_platformAccountId_fkey" FOREIGN KEY ("platformAccountId") REFERENCES "platform_collection_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

