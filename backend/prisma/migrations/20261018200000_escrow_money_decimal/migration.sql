-- Fase 3 (dinero a Decimal), tanda 2: garantías del Pago Protegido.
-- Mismo criterio que 20261018180000_wallet_money_decimal: ROUND(::numeric, 2)
-- fija el histórico al centavo. Los NULL se conservan (ROUND(NULL) = NULL).

-- AlterTable
ALTER TABLE "escrows"
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2) USING ROUND("amount"::numeric, 2);

-- AlterTable
ALTER TABLE "escrow_disputes"
  ALTER COLUMN "releaseAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("releaseAmount"::numeric, 2),
  ALTER COLUMN "refundAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("refundAmount"::numeric, 2);

-- AlterTable
ALTER TABLE "catalog_orders"
  ALTER COLUMN "escrowAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("escrowAmount"::numeric, 2);

-- AlterTable
ALTER TABLE "service_requests"
  ALTER COLUMN "escrowAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("escrowAmount"::numeric, 2);
