-- Add BCV auto-sync fields to exchange_rates table
ALTER TABLE "exchange_rates" ADD COLUMN IF NOT EXISTS "autoSync" BOOLEAN DEFAULT false;
ALTER TABLE "exchange_rates" ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMP(3);
ALTER TABLE "exchange_rates" ADD COLUMN IF NOT EXISTS "syncSource" VARCHAR(255);
ALTER TABLE "exchange_rates" ADD COLUMN IF NOT EXISTS "syncError" TEXT;
ALTER TABLE "exchange_rates" ADD COLUMN IF NOT EXISTS "syncAttempts" INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN "exchange_rates"."autoSync" IS 'Enable automatic BCV sync for this currency';
COMMENT ON COLUMN "exchange_rates"."lastSyncAt" IS 'Last successful sync timestamp';
COMMENT ON COLUMN "exchange_rates"."syncSource" IS 'Source used: BCV_SCRAPING, BCV_API, API_FALLBACK, MANUAL';
COMMENT ON COLUMN "exchange_rates"."syncError" IS 'Last sync error message if failed';
COMMENT ON COLUMN "exchange_rates"."syncAttempts" IS 'Consecutive failed sync attempts';
