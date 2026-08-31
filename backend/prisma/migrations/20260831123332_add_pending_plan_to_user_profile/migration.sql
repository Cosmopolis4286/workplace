-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "pendingPlanId" TEXT,
ADD COLUMN     "pendingPlanInterval" "BillingInterval";

-- CreateIndex
CREATE INDEX "user_profiles_pendingPlanId_idx" ON "user_profiles"("pendingPlanId");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_pendingPlanId_fkey" FOREIGN KEY ("pendingPlanId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
