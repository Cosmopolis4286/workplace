-- CreateEnum
CREATE TYPE "GroupBuyingCampaignStatus" AS ENUM ('OPEN', 'CLOSED', 'FULFILLED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "FeeTransactionType" ADD VALUE 'GROUP_BUYING';

-- CreateTable
CREATE TABLE "group_buying_campaigns" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "priceTiers" JSONB NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "status" "GroupBuyingCampaignStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_buying_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_buying_pledges" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "commerceId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "platformFeeRate" DOUBLE PRECISION,
    "platformFeeAmount" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_buying_pledges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_buying_campaigns_status_deadline_idx" ON "group_buying_campaigns"("status", "deadline");

-- CreateIndex
CREATE INDEX "group_buying_pledges_campaignId_idx" ON "group_buying_pledges"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "group_buying_pledges_campaignId_commerceId_key" ON "group_buying_pledges"("campaignId", "commerceId");

-- AddForeignKey
ALTER TABLE "group_buying_campaigns" ADD CONSTRAINT "group_buying_campaigns_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buying_pledges" ADD CONSTRAINT "group_buying_pledges_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "group_buying_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_buying_pledges" ADD CONSTRAINT "group_buying_pledges_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "commerces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
