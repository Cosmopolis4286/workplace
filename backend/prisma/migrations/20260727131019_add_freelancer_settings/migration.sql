-- CreateTable
CREATE TABLE "freelancer_settings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notifyNewRequests" BOOLEAN NOT NULL DEFAULT true,
    "notifyRequestUpdates" BOOLEAN NOT NULL DEFAULT true,
    "notifyDailyReports" BOOLEAN NOT NULL DEFAULT false,
    "notifyCustomerReviews" BOOLEAN NOT NULL DEFAULT true,
    "disabledModules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freelancer_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "freelancer_settings_userId_key" ON "freelancer_settings"("userId");

-- AddForeignKey
ALTER TABLE "freelancer_settings" ADD CONSTRAINT "freelancer_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
