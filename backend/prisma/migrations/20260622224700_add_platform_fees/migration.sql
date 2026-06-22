-- CreateEnum
CREATE TYPE "FeeTransactionType" AS ENUM ('ORDER', 'SERVICE_REQUEST', 'CORRIDA');

-- CreateEnum
CREATE TYPE "FeePayer" AS ENUM ('CLIENT', 'PROVIDER');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "platformFeeRate" DOUBLE PRECISION,
ADD COLUMN "platformFeeAmount" DOUBLE PRECISION,
ADD COLUMN "platformFeePayer" "FeePayer";

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN "platformFeeRate" DOUBLE PRECISION,
ADD COLUMN "platformFeeAmount" DOUBLE PRECISION,
ADD COLUMN "platformFeePayer" "FeePayer";

-- AlterTable
ALTER TABLE "corridas" ADD COLUMN "platformFeeRate" DOUBLE PRECISION,
ADD COLUMN "platformFeeAmount" DOUBLE PRECISION,
ADD COLUMN "platformFeePayer" "FeePayer";

-- CreateTable
CREATE TABLE "platform_fee_rates" (
    "id" TEXT NOT NULL,
    "type" "FeeTransactionType" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "payer" "FeePayer" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_fee_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_fee_overrides" (
    "id" TEXT NOT NULL,
    "type" "FeeTransactionType" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "payer" "FeePayer",
    "planId" TEXT,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_fee_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_fee_rates_type_isActive_idx" ON "platform_fee_rates"("type", "isActive");

-- CreateIndex
CREATE INDEX "platform_fee_overrides_type_userId_idx" ON "platform_fee_overrides"("type", "userId");

-- CreateIndex
CREATE INDEX "platform_fee_overrides_type_planId_idx" ON "platform_fee_overrides"("type", "planId");

-- AddForeignKey
ALTER TABLE "platform_fee_overrides" ADD CONSTRAINT "platform_fee_overrides_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_fee_overrides" ADD CONSTRAINT "platform_fee_overrides_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
