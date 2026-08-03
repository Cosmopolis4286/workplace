-- CreateTable
CREATE TABLE "wallet_deposit_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "reference" TEXT,
    "proofImageUrl" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resultingTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallet_deposit_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_deposit_requests_status_idx" ON "wallet_deposit_requests"("status");

-- CreateIndex
CREATE INDEX "wallet_deposit_requests_userId_status_idx" ON "wallet_deposit_requests"("userId", "status");

-- AddForeignKey
ALTER TABLE "wallet_deposit_requests" ADD CONSTRAINT "wallet_deposit_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_deposit_requests" ADD CONSTRAINT "wallet_deposit_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
