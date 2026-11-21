-- La consulta conserva su historial y queda marcada como convertida.
ALTER TYPE "ServiceInquiryStatus" ADD VALUE 'CONVERTED';

-- Relación 1:1: una consulta puede originar como máximo una contratación.
ALTER TABLE "service_requests"
ADD COLUMN "inquiryId" TEXT;

CREATE UNIQUE INDEX "service_requests_inquiryId_key"
ON "service_requests"("inquiryId");

ALTER TABLE "service_requests"
ADD CONSTRAINT "service_requests_inquiryId_fkey"
FOREIGN KEY ("inquiryId") REFERENCES "service_inquiries"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
