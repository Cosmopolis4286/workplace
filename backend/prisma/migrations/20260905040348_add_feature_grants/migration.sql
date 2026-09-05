-- CreateEnum
CREATE TYPE "FeatureUsageMode" AS ENUM ('SINGLE_USE', 'MULTI_USE', 'REACTIVATABLE');

-- CreateEnum
CREATE TYPE "FeatureGrantStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'EXHAUSTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "FeatureGrantSource" AS ENUM ('SELF_SERVICE', 'ADMIN');

-- CreateTable
CREATE TABLE "plan_feature_rules" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "usageMode" "FeatureUsageMode" NOT NULL,
    "maxUses" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_feature_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "ruleId" TEXT,
    "source" "FeatureGrantSource" NOT NULL,
    "grantedBy" TEXT,
    "usageMode" "FeatureUsageMode" NOT NULL,
    "usesRemaining" INTEGER,
    "activatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" "FeatureGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_feature_rules_planId_featureKey_key" ON "plan_feature_rules"("planId", "featureKey");

-- CreateIndex
CREATE INDEX "feature_grants_userId_featureKey_status_idx" ON "feature_grants"("userId", "featureKey", "status");

-- CreateIndex
CREATE INDEX "feature_grants_expiresAt_idx" ON "feature_grants"("expiresAt");

-- AddForeignKey
ALTER TABLE "plan_feature_rules" ADD CONSTRAINT "plan_feature_rules_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_grants" ADD CONSTRAINT "feature_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_grants" ADD CONSTRAINT "feature_grants_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "plan_feature_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
