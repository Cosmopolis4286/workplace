-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'TRIAL', 'PENDING');

-- CreateEnum
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "priceAnnual" DOUBLE PRECISION,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "forCommerce" BOOLEAN NOT NULL DEFAULT true,
    "forFreelancer" BOOLEAN NOT NULL DEFAULT false,
    "maxProducts" INTEGER NOT NULL DEFAULT 50,
    "maxEmployees" INTEGER NOT NULL DEFAULT 5,
    "maxBranches" INTEGER NOT NULL DEFAULT 1,
    "maxOrders" INTEGER NOT NULL DEFAULT -1,
    "maxStorage" INTEGER NOT NULL DEFAULT 1,
    "features" JSONB NOT NULL DEFAULT '[]',
    "hasAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "hasDelivery" BOOLEAN NOT NULL DEFAULT false,
    "hasReports" BOOLEAN NOT NULL DEFAULT false,
    "hasApiAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasPrioritySupport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endAt" TIMESTAMP(3),
    "trialEnds" TIMESTAMP(3),
    "pricePaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "assignedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE INDEX "subscriptions_planId_idx" ON "subscriptions"("planId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
