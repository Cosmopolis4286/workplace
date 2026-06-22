-- AlterEnum
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'CANCELADO';

-- AlterTable
ALTER TABLE "service_requests" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

