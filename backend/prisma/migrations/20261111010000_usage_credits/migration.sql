-- CreateEnum
CREATE TYPE "UsageCreditLotKind" AS ENUM ('PURCHASED', 'PROMOTIONAL');

-- CreateEnum
CREATE TYPE "UsageCreditMovementType" AS ENUM ('GRANT', 'CONSUME', 'EXPIRE', 'REVERSAL');

-- CreateEnum
CREATE TYPE "UsageCreditConcept" AS ENUM ('PURCHASE', 'PROMOTION', 'LEAD_FEE', 'SUCCESS_FEE', 'EXPIRATION', 'REVERSAL', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "usage_credit_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packageCode" TEXT NOT NULL,
    "units" DECIMAL(20,2) NOT NULL,
    "priceUsd" DECIMAL(20,2) NOT NULL,
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

    CONSTRAINT "usage_credit_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_credit_lots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "UsageCreditLotKind" NOT NULL,
    "units" DECIMAL(20,2) NOT NULL,
    "remaining" DECIMAL(20,2) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "purchaseId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_credit_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_credit_movements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lotId" TEXT,
    "eventId" TEXT NOT NULL,
    "type" "UsageCreditMovementType" NOT NULL,
    "concept" "UsageCreditConcept" NOT NULL,
    "units" DECIMAL(20,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_credit_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_credit_events" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "concept" "UsageCreditConcept" NOT NULL,
    "units" DECIMAL(20,2) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_credit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "usage_credit_purchases_status_createdAt_idx" ON "usage_credit_purchases"("status", "createdAt");

-- CreateIndex
CREATE INDEX "usage_credit_purchases_userId_createdAt_idx" ON "usage_credit_purchases"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "usage_credit_purchases_reference_idx" ON "usage_credit_purchases"("reference");

-- CreateIndex
CREATE INDEX "usage_credit_lots_userId_kind_remaining_idx" ON "usage_credit_lots"("userId", "kind", "remaining");

-- CreateIndex
CREATE INDEX "usage_credit_lots_kind_expiresAt_idx" ON "usage_credit_lots"("kind", "expiresAt");

-- CreateIndex
CREATE INDEX "usage_credit_movements_userId_createdAt_idx" ON "usage_credit_movements"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "usage_credit_movements_eventId_idx" ON "usage_credit_movements"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "usage_credit_events_reference_key" ON "usage_credit_events"("reference");

-- CreateIndex
CREATE INDEX "usage_credit_events_userId_createdAt_idx" ON "usage_credit_events"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "usage_credit_purchases" ADD CONSTRAINT "usage_credit_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_credit_lots" ADD CONSTRAINT "usage_credit_lots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_credit_lots" ADD CONSTRAINT "usage_credit_lots_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "usage_credit_purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_credit_movements" ADD CONSTRAINT "usage_credit_movements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_credit_movements" ADD CONSTRAINT "usage_credit_movements_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "usage_credit_lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_credit_movements" ADD CONSTRAINT "usage_credit_movements_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "usage_credit_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

