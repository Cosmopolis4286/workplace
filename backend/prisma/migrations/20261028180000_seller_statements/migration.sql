-- CreateEnum
CREATE TYPE "SellerChargeStatus" AS ENUM ('PENDING', 'STATEMENTED', 'COLLECTED');

-- CreateEnum
CREATE TYPE "SellerStatementStatus" AS ENUM ('ISSUED', 'PAYMENT_REPORTED', 'PAID', 'OVERDUE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "seller_commission_charges" (
    "id" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
    "type" "FeeTransactionType" NOT NULL,
    "reference" TEXT NOT NULL,
    "amount" DECIMAL(20,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "SellerChargeStatus" NOT NULL DEFAULT 'PENDING',
    "statementId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_commission_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_statements" (
    "id" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalAmount" DECIMAL(20,2) NOT NULL,
    "status" "SellerStatementStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "overdueAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "pausedServiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pausedProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_collection_accounts" (
    "id" TEXT NOT NULL,
    "method" "SellerPaymentMethod" NOT NULL,
    "currency" TEXT NOT NULL,
    "bankCode" TEXT,
    "bankName" TEXT,
    "holderName" TEXT NOT NULL,
    "holderDocument" TEXT NOT NULL,
    "phone" TEXT,
    "accountNumber" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_collection_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_statement_payments" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
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

    CONSTRAINT "seller_statement_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seller_commission_charges_reference_key" ON "seller_commission_charges"("reference");

-- CreateIndex
CREATE INDEX "seller_commission_charges_sellerUserId_status_createdAt_idx" ON "seller_commission_charges"("sellerUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "seller_commission_charges_statementId_idx" ON "seller_commission_charges"("statementId");

-- CreateIndex
CREATE INDEX "seller_statements_status_dueAt_idx" ON "seller_statements"("status", "dueAt");

-- CreateIndex
CREATE INDEX "seller_statements_sellerUserId_status_idx" ON "seller_statements"("sellerUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "seller_statements_sellerUserId_periodStart_key" ON "seller_statements"("sellerUserId", "periodStart");

-- CreateIndex
CREATE INDEX "platform_collection_accounts_isActive_idx" ON "platform_collection_accounts"("isActive");

-- CreateIndex
CREATE INDEX "seller_statement_payments_status_createdAt_idx" ON "seller_statement_payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "seller_statement_payments_statementId_idx" ON "seller_statement_payments"("statementId");

-- CreateIndex
CREATE INDEX "seller_statement_payments_reference_idx" ON "seller_statement_payments"("reference");

-- AddForeignKey
ALTER TABLE "seller_commission_charges" ADD CONSTRAINT "seller_commission_charges_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_commission_charges" ADD CONSTRAINT "seller_commission_charges_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "seller_statements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_statements" ADD CONSTRAINT "seller_statements_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_statement_payments" ADD CONSTRAINT "seller_statement_payments_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "seller_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_statement_payments" ADD CONSTRAINT "seller_statement_payments_platformAccountId_fkey" FOREIGN KEY ("platformAccountId") REFERENCES "platform_collection_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

