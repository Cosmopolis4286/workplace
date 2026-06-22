-- AlterTable
ALTER TABLE "services" ADD COLUMN "itemFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "service_request_items" (
    "id" TEXT NOT NULL,
    "serviceRequestId" TEXT NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "videos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_request_items_serviceRequestId_idx" ON "service_request_items"("serviceRequestId");

-- AddForeignKey
ALTER TABLE "service_request_items" ADD CONSTRAINT "service_request_items_serviceRequestId_fkey" FOREIGN KEY ("serviceRequestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
