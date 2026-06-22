-- CreateEnum
CREATE TYPE "ProposedCategoryTarget" AS ENUM ('PRODUCTO', 'SERVICIO', 'EMPLEO');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "proposed_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "target" "ProposedCategoryTarget" NOT NULL,
    "proposedBy" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resultingCategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proposed_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "proposed_categories_status_idx" ON "proposed_categories"("status");

-- CreateIndex
CREATE INDEX "proposed_categories_target_status_idx" ON "proposed_categories"("target", "status");

-- AddForeignKey
ALTER TABLE "proposed_categories" ADD CONSTRAINT "proposed_categories_proposedBy_fkey" FOREIGN KEY ("proposedBy") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proposed_categories" ADD CONSTRAINT "proposed_categories_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

