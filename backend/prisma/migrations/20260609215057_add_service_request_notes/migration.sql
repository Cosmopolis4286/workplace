-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "providerNotes" TEXT,
ADD COLUMN     "statusUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
