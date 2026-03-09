-- CreateEnum
CREATE TYPE "ServiceEventType" AS ENUM ('VIEW', 'PROFILE_VISIT', 'REQUEST');

-- CreateTable
CREATE TABLE "service_events" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "type" "ServiceEventType" NOT NULL,
    "viewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_events_serviceId_idx" ON "service_events"("serviceId");

-- CreateIndex
CREATE INDEX "service_events_serviceId_type_idx" ON "service_events"("serviceId", "type");

-- CreateIndex
CREATE INDEX "service_events_createdAt_idx" ON "service_events"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "service_events" ADD CONSTRAINT "service_events_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;
