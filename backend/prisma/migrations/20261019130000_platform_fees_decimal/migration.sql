-- Fase 3 (dinero a Decimal), tanda 4: comisiones de plataforma.
-- Tasas (porcentaje, ej. 10 = 10%) a DECIMAL(20,8); montos de comisión a
-- DECIMAL(20,2). Mismo criterio de redondeo del histórico que las tandas
-- anteriores; los NULL se conservan.

-- AlterTable
ALTER TABLE "platform_fee_rates"
  ALTER COLUMN "rate" SET DATA TYPE DECIMAL(20,8) USING ROUND("rate"::numeric, 8);

-- AlterTable
ALTER TABLE "platform_fee_overrides"
  ALTER COLUMN "rate" SET DATA TYPE DECIMAL(20,8) USING ROUND("rate"::numeric, 8);

-- AlterTable
ALTER TABLE "orders"
  ALTER COLUMN "platformFeeRate" SET DATA TYPE DECIMAL(20,8) USING ROUND("platformFeeRate"::numeric, 8),
  ALTER COLUMN "platformFeeAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("platformFeeAmount"::numeric, 2);

-- AlterTable
ALTER TABLE "catalog_orders"
  ALTER COLUMN "platformFeeRate" SET DATA TYPE DECIMAL(20,8) USING ROUND("platformFeeRate"::numeric, 8),
  ALTER COLUMN "platformFeeAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("platformFeeAmount"::numeric, 2);

-- AlterTable
ALTER TABLE "service_requests"
  ALTER COLUMN "platformFeeRate" SET DATA TYPE DECIMAL(20,8) USING ROUND("platformFeeRate"::numeric, 8),
  ALTER COLUMN "platformFeeAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("platformFeeAmount"::numeric, 2);

-- AlterTable
ALTER TABLE "rides"
  ALTER COLUMN "platformFeeRate" SET DATA TYPE DECIMAL(20,8) USING ROUND("platformFeeRate"::numeric, 8),
  ALTER COLUMN "platformFeeAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("platformFeeAmount"::numeric, 2);

-- AlterTable
ALTER TABLE "group_buying_pledges"
  ALTER COLUMN "platformFeeRate" SET DATA TYPE DECIMAL(20,8) USING ROUND("platformFeeRate"::numeric, 8),
  ALTER COLUMN "platformFeeAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("platformFeeAmount"::numeric, 2);
