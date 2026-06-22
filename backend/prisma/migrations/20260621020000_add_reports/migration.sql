-- CreateEnum
CREATE TYPE "ReportEntityType" AS ENUM ('CATALOG_ORDER', 'SERVICE_REQUEST', 'GENERAL');
-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDIENTE', 'EN_REVISION', 'RESUELTO', 'DESCARTADO');
-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "entityType" "ReportEntityType" NOT NULL,
    "entityId" TEXT,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDIENTE',
    "adminNotes" TEXT,
    "reporterId" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "reports_entityType_entityId_idx" ON "reports"("entityType", "entityId");
-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");
-- CreateIndex
CREATE INDEX "reports_reporterId_idx" ON "reports"("reporterId");
-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt" DESC);
-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
