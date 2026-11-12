-- Aceptación explícita del cargo por oportunidad (créditos de uso, apagado
-- por USAGE_CREDITS_ENABLED): una por solicitud, con lo que se le mostró al proveedor.
-- CreateTable
CREATE TABLE "service_lead_acceptances" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "policyVersion" TEXT NOT NULL,
    "leadFeeUnits" DECIMAL(20,2) NOT NULL,
    "commissionRate" DECIMAL(20,8),
    "estimatedCommissionUnits" DECIMAL(20,2),
    "basePrice" DECIMAL(20,2),
    "leadFeeReference" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_lead_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_lead_acceptances_serviceRequestId_key" ON "service_lead_acceptances"("serviceRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "service_lead_acceptances_leadFeeReference_key" ON "service_lead_acceptances"("leadFeeReference");

-- CreateIndex
CREATE INDEX "service_lead_acceptances_providerId_acceptedAt_idx" ON "service_lead_acceptances"("providerId", "acceptedAt" DESC);

-- AddForeignKey
ALTER TABLE "service_lead_acceptances" ADD CONSTRAINT "service_lead_acceptances_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

