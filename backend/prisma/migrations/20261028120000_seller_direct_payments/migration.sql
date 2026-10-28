-- CreateEnum
CREATE TYPE "SellerPaymentMethod" AS ENUM ('PAGO_MOVIL', 'BANK_TRANSFER', 'ZELLE');

-- CreateEnum
CREATE TYPE "ManualPaymentReportStatus" AS ENUM ('SUBMITTED', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "seller_payment_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_payment_reports" (
    "id" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "sellerPaymentAccountId" TEXT,
    "destination" JSONB NOT NULL,
    "payerUserId" TEXT NOT NULL,
    "sellerUserId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "payerBankCode" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "paidCurrency" TEXT NOT NULL,
    "paidAmount" DECIMAL(20,2) NOT NULL,
    "exchangeRate" DECIMAL(20,8),
    "status" "ManualPaymentReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manual_payment_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_payment_accounts_userId_isActive_idx" ON "seller_payment_accounts"("userId", "isActive");

-- CreateIndex
CREATE INDEX "manual_payment_reports_sellerUserId_status_createdAt_idx" ON "manual_payment_reports"("sellerUserId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "manual_payment_reports_sellerUserId_reference_idx" ON "manual_payment_reports"("sellerUserId", "reference");

-- CreateIndex
CREATE INDEX "manual_payment_reports_payerUserId_createdAt_idx" ON "manual_payment_reports"("payerUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "manual_payment_reports_paymentIntentId_idx" ON "manual_payment_reports"("paymentIntentId");

-- AddForeignKey
ALTER TABLE "seller_payment_accounts" ADD CONSTRAINT "seller_payment_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_reports" ADD CONSTRAINT "manual_payment_reports_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "external_payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_payment_reports" ADD CONSTRAINT "manual_payment_reports_sellerPaymentAccountId_fkey" FOREIGN KEY ("sellerPaymentAccountId") REFERENCES "seller_payment_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

