-- CreateEnum
CREATE TYPE "AccountSuspensionReason" AS ENUM ('FRAUD', 'ABUSE', 'POLICY_VIOLATION', 'IDENTITY_ISSUE', 'PAYMENT_ISSUE', 'SECURITY', 'USER_REQUEST', 'OTHER');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "suspendedAt" TIMESTAMP(3),
ADD COLUMN     "suspendedById" TEXT,
ADD COLUMN     "suspensionNote" TEXT,
ADD COLUMN     "suspensionReason" "AccountSuspensionReason";

