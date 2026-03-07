-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDIENTE', 'VISTO', 'CONTACTADO', 'CERRADO');

-- CreateEnum
CREATE TYPE "ServiceRequestModality" AS ENUM ('PRESENCIAL', 'REMOTO', 'CUALQUIERA');

-- CreateTable
CREATE TABLE "service_requests" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "modality" "ServiceRequestModality" NOT NULL DEFAULT 'CUALQUIERA',
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "description" TEXT,
    "price" DOUBLE PRECISION,
    "priceUnit" TEXT,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "requesterId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_requests_serviceId_idx" ON "service_requests"("serviceId");

-- CreateIndex
CREATE INDEX "service_requests_providerId_idx" ON "service_requests"("providerId");

-- CreateIndex
CREATE INDEX "service_requests_status_idx" ON "service_requests"("status");

-- CreateIndex
CREATE INDEX "service_requests_createdAt_idx" ON "service_requests"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
