-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('MARGIN_DROP', 'REPLACEMENT_COST_RISK', 'SUPPLIER_PRICE_CHANGE', 'LOW_LIQUIDITY');

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "commerceId" TEXT NOT NULL,
    "alertType" "AlertType" NOT NULL,
    "thresholdValue" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alert_rules_commerceId_alertType_key" ON "alert_rules"("commerceId", "alertType");

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_commerceId_fkey" FOREIGN KEY ("commerceId") REFERENCES "commerces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
