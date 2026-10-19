-- Fase 3 (dinero a Decimal), tanda 3: caja (arqueo).
-- Mismo criterio que 20261018180000_wallet_money_decimal: ROUND(::numeric, 2)
-- fija el histórico al centavo. Los NULL se conservan.

-- AlterTable
ALTER TABLE "cash_sessions"
  ALTER COLUMN "openingAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("openingAmount"::numeric, 2),
  ALTER COLUMN "countedAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("countedAmount"::numeric, 2),
  ALTER COLUMN "expectedAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("expectedAmount"::numeric, 2),
  ALTER COLUMN "difference" SET DATA TYPE DECIMAL(20,2) USING ROUND("difference"::numeric, 2);

-- AlterTable
ALTER TABLE "cash_movements"
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2) USING ROUND("amount"::numeric, 2);
