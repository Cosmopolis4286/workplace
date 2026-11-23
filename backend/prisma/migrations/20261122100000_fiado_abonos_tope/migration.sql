-- AlterTable
ALTER TABLE "account_receivables" ADD COLUMN     "paidAmount" DECIMAL(20,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "creditLimitUsd" DECIMAL(20,2);

-- CreateTable
CREATE TABLE "receivable_payments" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "exchangeRateValue" DECIMAL(20,8) NOT NULL,
    "amountUsd" DECIMAL(20,2) NOT NULL,
    "appliedAmount" DECIMAL(20,2) NOT NULL,
    "method" TEXT,
    "note" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receivable_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receivable_payments_receivableId_createdAt_idx" ON "receivable_payments"("receivableId", "createdAt");

-- AddForeignKey
ALTER TABLE "receivable_payments" ADD CONSTRAINT "receivable_payments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "account_receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

