-- Consulta preliminar separada de la contratación formal.
CREATE TYPE "ServiceInquiryStatus" AS ENUM ('OPEN', 'RESPONDED', 'CLOSED', 'CANCELLED');

CREATE TABLE "service_inquiries" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "modality" "ServiceRequestModality" NOT NULL DEFAULT 'ANY',
    "preferredDate" TIMESTAMP(3),
    "preferredTime" TEXT,
    "address" TEXT,
    "city" TEXT,
    "clientPhone" TEXT,
    "message" TEXT,
    "status" "ServiceInquiryStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "service_inquiries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "service_inquiries_requesterId_createdAt_idx"
    ON "service_inquiries"("requesterId", "createdAt" DESC);
CREATE INDEX "service_inquiries_providerId_status_createdAt_idx"
    ON "service_inquiries"("providerId", "status", "createdAt" DESC);
CREATE INDEX "service_inquiries_serviceId_requesterId_status_idx"
    ON "service_inquiries"("serviceId", "requesterId", "status");

ALTER TABLE "service_inquiries"
    ADD CONSTRAINT "service_inquiries_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "services"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "service_inquiries"
    ADD CONSTRAINT "service_inquiries_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
