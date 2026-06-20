-- CreateEnum
CREATE TYPE "ReviewReportStatus" AS ENUM ('PENDIENTE', 'REVISADO', 'DESCARTADO');

-- AlterTable
ALTER TABLE "landing_testimonials" ADD COLUMN     "sourceReviewId" TEXT;

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "response" TEXT,
ADD COLUMN     "verifiedOrderId" TEXT,
ADD COLUMN     "verifiedRequestId" TEXT;

-- CreateTable
CREATE TABLE "review_reports" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReviewReportStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "review_reports_reviewId_idx" ON "review_reports"("reviewId");

-- CreateIndex
CREATE INDEX "review_reports_status_idx" ON "review_reports"("status");

-- CreateIndex
CREATE UNIQUE INDEX "landing_testimonials_sourceReviewId_key" ON "landing_testimonials"("sourceReviewId");

-- AddForeignKey
ALTER TABLE "review_reports" ADD CONSTRAINT "review_reports_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
