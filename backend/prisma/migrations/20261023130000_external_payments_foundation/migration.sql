-- Provider-independent external payments foundation; no wallet custody is added.
CREATE TYPE "ExternalPaymentProvider" AS ENUM ('VEXPAY','PAGOLINK','BDV','MANUAL');
CREATE TYPE "ExternalPaymentStatus" AS ENUM ('DRAFT','REQUIRES_ACTION','PENDING','PROCESSING','SUCCEEDED','FAILED','CANCELLED','EXPIRED','PARTIALLY_REFUNDED','REFUNDED','REQUIRES_RECONCILIATION');
CREATE TYPE "ExternalSettlementMode" AS ENUM ('PROVIDER_SPLIT','DIRECT_TO_SELLER','COMMISSION_INVOICE');
CREATE TYPE "ExternalCommissionCollectionMode" AS ENUM ('AUTOMATIC_SPLIT','PERIODIC_INVOICE','MANUAL_COLLECTION');
CREATE TYPE "ExternalCommissionStatus" AS ENUM ('PENDING','EARNED','INVOICED','COLLECTED','REVERSED','DISPUTED');
CREATE TYPE "ExternalRefundStatus" AS ENUM ('REQUESTED','UNDER_REVIEW','APPROVED','PROCESSING','SUCCEEDED','FAILED','REJECTED');
CREATE TYPE "ExternalWebhookStatus" AS ENUM ('RECEIVED','PROCESSING','PROCESSED','FAILED','IGNORED');
CREATE TYPE "ExternalSettlementStatus" AS ENUM ('NOT_ELIGIBLE','PENDING','AVAILABLE','PAYOUT_REQUESTED','PAID','FAILED','ON_HOLD');
CREATE TYPE "ExternalReconciliationStatus" AS ENUM ('OPEN','MATCHED','MISMATCH','RESOLVED');
CREATE TABLE "external_payment_intents" (
"id" TEXT NOT NULL,"idempotencyKey" TEXT NOT NULL,"sourceType" TEXT NOT NULL,"sourceId" TEXT NOT NULL,"payerUserId" TEXT,"sellerUserId" TEXT NOT NULL,
"provider" "ExternalPaymentProvider" NOT NULL,"status" "ExternalPaymentStatus" NOT NULL DEFAULT 'DRAFT',"currency" TEXT NOT NULL,
"baseAmount" DECIMAL(20,2) NOT NULL,"amount" DECIMAL(20,2) NOT NULL,"commissionAmount" DECIMAL(20,2) NOT NULL DEFAULT 0,
"sellerNetAmount" DECIMAL(20,2) NOT NULL,"commissionRateBps" INTEGER NOT NULL DEFAULT 0,"commissionPayer" "FeePayer" NOT NULL DEFAULT 'PROVIDER',
"settlementMode" "ExternalSettlementMode" NOT NULL,"collectionMode" "ExternalCommissionCollectionMode" NOT NULL,
"providerPaymentId" TEXT,"providerCheckoutUrl" TEXT,"providerStatus" TEXT,"failureCode" TEXT,"failureMessage" TEXT,
"expiresAt" TIMESTAMP(3),"succeededAt" TIMESTAMP(3),"metadata" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "external_payment_intents_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "external_payment_intents_idempotencyKey_key" ON "external_payment_intents"("idempotencyKey");
CREATE UNIQUE INDEX "external_payment_intents_provider_providerPaymentId_key" ON "external_payment_intents"("provider","providerPaymentId");
CREATE INDEX "external_payment_intents_sourceType_sourceId_idx" ON "external_payment_intents"("sourceType","sourceId");
CREATE INDEX "external_payment_intents_payerUserId_createdAt_idx" ON "external_payment_intents"("payerUserId","createdAt" DESC);
CREATE INDEX "external_payment_intents_sellerUserId_createdAt_idx" ON "external_payment_intents"("sellerUserId","createdAt" DESC);
CREATE INDEX "external_payment_intents_status_createdAt_idx" ON "external_payment_intents"("status","createdAt");
CREATE TABLE "external_payment_commissions" (
"id" TEXT NOT NULL,"paymentIntentId" TEXT NOT NULL,"sellerUserId" TEXT NOT NULL,"currency" TEXT NOT NULL,"baseAmount" DECIMAL(20,2) NOT NULL,
"feeAmount" DECIMAL(20,2) NOT NULL,"sellerNetAmount" DECIMAL(20,2) NOT NULL,"rateBps" INTEGER NOT NULL,"payer" "FeePayer" NOT NULL,
"collectionMode" "ExternalCommissionCollectionMode" NOT NULL,"status" "ExternalCommissionStatus" NOT NULL DEFAULT 'PENDING',
"invoiceReference" TEXT,"collectedAt" TIMESTAMP(3),"reversedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "external_payment_commissions_pkey" PRIMARY KEY ("id"),
CONSTRAINT "external_payment_commissions_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "external_payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX "external_payment_commissions_paymentIntentId_key" ON "external_payment_commissions"("paymentIntentId");
CREATE INDEX "external_payment_commissions_sellerUserId_status_createdAt_idx" ON "external_payment_commissions"("sellerUserId","status","createdAt");
CREATE INDEX "external_payment_commissions_status_createdAt_idx" ON "external_payment_commissions"("status","createdAt");
CREATE TABLE "external_payment_refunds" (
"id" TEXT NOT NULL,"paymentIntentId" TEXT NOT NULL,"amount" DECIMAL(20,2) NOT NULL,"currency" TEXT NOT NULL,"reason" TEXT NOT NULL,
"status" "ExternalRefundStatus" NOT NULL DEFAULT 'REQUESTED',"requestedByUserId" TEXT,"providerRefundId" TEXT,"idempotencyKey" TEXT NOT NULL,
"providerMessage" TEXT,"approvedByUserId" TEXT,"processedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "external_payment_refunds_pkey" PRIMARY KEY ("id"),
CONSTRAINT "external_payment_refunds_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "external_payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX "external_payment_refunds_providerRefundId_key" ON "external_payment_refunds"("providerRefundId");
CREATE UNIQUE INDEX "external_payment_refunds_idempotencyKey_key" ON "external_payment_refunds"("idempotencyKey");
CREATE INDEX "external_payment_refunds_paymentIntentId_status_idx" ON "external_payment_refunds"("paymentIntentId","status");
CREATE INDEX "external_payment_refunds_status_createdAt_idx" ON "external_payment_refunds"("status","createdAt");
CREATE TABLE "external_payment_webhook_events" (
"id" TEXT NOT NULL,"provider" "ExternalPaymentProvider" NOT NULL,"providerEventId" TEXT NOT NULL,"eventType" TEXT NOT NULL,
"signatureVerified" BOOLEAN NOT NULL DEFAULT false,"status" "ExternalWebhookStatus" NOT NULL DEFAULT 'RECEIVED',"payload" JSONB NOT NULL,
"processingError" TEXT,"receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"processedAt" TIMESTAMP(3),
CONSTRAINT "external_payment_webhook_events_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "external_payment_webhook_events_provider_providerEventId_key" ON "external_payment_webhook_events"("provider","providerEventId");
CREATE INDEX "external_payment_webhook_events_status_receivedAt_idx" ON "external_payment_webhook_events"("status","receivedAt");
CREATE TABLE "external_payment_settlements" (
"id" TEXT NOT NULL,"paymentIntentId" TEXT,"sellerUserId" TEXT NOT NULL,"provider" "ExternalPaymentProvider" NOT NULL,"currency" TEXT NOT NULL,
"amount" DECIMAL(20,2) NOT NULL,"status" "ExternalSettlementStatus" NOT NULL DEFAULT 'PENDING',"providerPayoutId" TEXT,
"externalReference" TEXT NOT NULL,"expectedAt" TIMESTAMP(3),"paidAt" TIMESTAMP(3),"failureReason" TEXT,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "external_payment_settlements_pkey" PRIMARY KEY ("id"),
CONSTRAINT "external_payment_settlements_paymentIntentId_fkey" FOREIGN KEY ("paymentIntentId") REFERENCES "external_payment_intents"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX "external_payment_settlements_provider_providerPayoutId_key" ON "external_payment_settlements"("provider","providerPayoutId");
CREATE UNIQUE INDEX "external_payment_settlements_externalReference_key" ON "external_payment_settlements"("externalReference");
CREATE INDEX "external_payment_settlements_sellerUserId_status_createdAt_idx" ON "external_payment_settlements"("sellerUserId","status","createdAt");
CREATE INDEX "external_payment_settlements_provider_status_idx" ON "external_payment_settlements"("provider","status");
CREATE TABLE "external_payment_reconciliation_runs" (
"id" TEXT NOT NULL,"provider" "ExternalPaymentProvider" NOT NULL,"currency" TEXT,"periodStart" TIMESTAMP(3) NOT NULL,"periodEnd" TIMESTAMP(3) NOT NULL,
"status" "ExternalReconciliationStatus" NOT NULL DEFAULT 'OPEN',"totalExpected" DECIMAL(20,2) NOT NULL DEFAULT 0,
"totalReported" DECIMAL(20,2) NOT NULL DEFAULT 0,"differenceCount" INTEGER NOT NULL DEFAULT 0,"notes" TEXT,
"startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"completedAt" TIMESTAMP(3),
CONSTRAINT "external_payment_reconciliation_runs_pkey" PRIMARY KEY ("id"));
CREATE INDEX "external_payment_reconciliation_runs_provider_periodStart_p_idx" ON "external_payment_reconciliation_runs"("provider","periodStart","periodEnd");
CREATE INDEX "external_payment_reconciliation_runs_status_startedAt_idx" ON "external_payment_reconciliation_runs"("status","startedAt");
CREATE TABLE "external_payment_reconciliation_items" (
"id" TEXT NOT NULL,"runId" TEXT NOT NULL,"externalRef" TEXT,"internalRef" TEXT,"currency" TEXT NOT NULL,
"expectedAmount" DECIMAL(20,2),"reportedAmount" DECIMAL(20,2),"status" "ExternalReconciliationStatus" NOT NULL DEFAULT 'OPEN',
"reason" TEXT,"resolvedBy" TEXT,"resolvedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "external_payment_reconciliation_items_pkey" PRIMARY KEY ("id"),
CONSTRAINT "external_payment_reconciliation_items_runId_fkey" FOREIGN KEY ("runId") REFERENCES "external_payment_reconciliation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX "external_payment_reconciliation_items_runId_status_idx" ON "external_payment_reconciliation_items"("runId","status");
CREATE INDEX "external_payment_reconciliation_items_externalRef_idx" ON "external_payment_reconciliation_items"("externalRef");
