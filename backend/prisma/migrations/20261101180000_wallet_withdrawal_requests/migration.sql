-- CreateEnum
CREATE TYPE "WalletWithdrawalStatus" AS ENUM ('PENDING', 'PAID', 'REJECTED');

-- CreateTable
CREATE TABLE "wallet_withdrawal_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "payoutAccountId" TEXT,
    "destination" JSONB NOT NULL,
    "status" "WalletWithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "debitTransactionId" TEXT NOT NULL,
    "reversalTransactionId" TEXT,
    "payoutReference" TEXT,
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_withdrawal_requests_debitTransactionId_key" ON "wallet_withdrawal_requests"("debitTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_withdrawal_requests_reversalTransactionId_key" ON "wallet_withdrawal_requests"("reversalTransactionId");

-- CreateIndex
CREATE INDEX "wallet_withdrawal_requests_status_createdAt_idx" ON "wallet_withdrawal_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_withdrawal_requests_userId_createdAt_idx" ON "wallet_withdrawal_requests"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "wallet_withdrawal_requests" ADD CONSTRAINT "wallet_withdrawal_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
