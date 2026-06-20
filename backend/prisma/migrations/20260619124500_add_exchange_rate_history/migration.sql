-- CreateTable
CREATE TABLE "exchange_rate_history" (
    "id" TEXT NOT NULL,
    "exchangeRateId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "previousRate" DOUBLE PRECISION,
    "newRate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rate_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rate_history_exchangeRateId_idx" ON "exchange_rate_history"("exchangeRateId");

-- CreateIndex
CREATE INDEX "exchange_rate_history_createdAt_idx" ON "exchange_rate_history"("createdAt" DESC);

-- AddForeignKey
ALTER TABLE "exchange_rate_history" ADD CONSTRAINT "exchange_rate_history_exchangeRateId_fkey" FOREIGN KEY ("exchangeRateId") REFERENCES "exchange_rates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
