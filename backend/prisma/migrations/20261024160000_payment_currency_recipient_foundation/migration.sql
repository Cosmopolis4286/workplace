-- Currency snapshots remain nullable for legacy rows; no historical price is guessed as USD or VES.
ALTER TABLE "plans" ADD COLUMN "currency" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN "currency" TEXT;

-- A platform recipient is deliberately disabled until operations verifies it.
CREATE TYPE "PlatformPaymentEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

CREATE TABLE "platform_payment_recipients" (
  "id" TEXT NOT NULL,
  "provider" "ExternalPaymentProvider" NOT NULL,
  "currency" TEXT NOT NULL,
  "environment" "PlatformPaymentEnvironment" NOT NULL,
  "recipientReference" TEXT NOT NULL,
  "displayName" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "platform_payment_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_payment_recipients_provider_currency_environment_key"
  ON "platform_payment_recipients"("provider", "currency", "environment");
CREATE INDEX "platform_payment_recipients_isEnabled_provider_currency_idx"
  ON "platform_payment_recipients"("isEnabled", "provider", "currency");
