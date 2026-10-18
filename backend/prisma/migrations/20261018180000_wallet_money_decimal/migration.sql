-- Fase 3 (dinero a Decimal), tanda 1: libro de wallets.
-- Float no representa centavos exactos (0.1 + 0.2 = 0.30000000000000004) y el
-- error se acumula en saldos. ROUND(::numeric, 2) fija el histórico al
-- centavo: Postgres convierte el float por su representación decimal corta,
-- así 19.999999999 -> 20.00 y 0.30000000000000004 -> 0.30.

-- AlterTable
ALTER TABLE "wallets"
  ALTER COLUMN "balance" SET DATA TYPE DECIMAL(20,2) USING ROUND("balance"::numeric, 2);

-- AlterTable
ALTER TABLE "wallet_transactions"
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2) USING ROUND("amount"::numeric, 2),
  ALTER COLUMN "balanceAfter" SET DATA TYPE DECIMAL(20,2) USING ROUND("balanceAfter"::numeric, 2);

-- AlterTable
ALTER TABLE "wallet_deposit_requests"
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2) USING ROUND("amount"::numeric, 2);
