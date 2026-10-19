-- Fase 3 (dinero a Decimal), tanda 5: tasas de cambio, cuentas por cobrar/pagar,
-- cotizaciones de proveedores y compras.
-- Tasas a DECIMAL(20,8). Montos de cuentas (moneda local y USD) a DECIMAL(20,2).
-- Costos/precios UNITARIOS de compras y cotizaciones (unitCost, price y sus
-- equivalentes en USD) a DECIMAL(20,8): 1 Bs / 36.5 = 0.0274 USD, y una
-- compra al mayor puede costar 0.004 USD por unidad; al centavo se perdería
-- ese dato y se distorsionarían los márgenes. ROUND(::numeric, n) fija el histórico.

-- AlterTable
ALTER TABLE "exchange_rates"
  ALTER COLUMN "rateToUsd" SET DATA TYPE DECIMAL(20,8) USING ROUND("rateToUsd"::numeric, 8);

-- AlterTable
ALTER TABLE "exchange_rate_history"
  ALTER COLUMN "previousRate" SET DATA TYPE DECIMAL(20,8) USING ROUND("previousRate"::numeric, 8),
  ALTER COLUMN "newRate" SET DATA TYPE DECIMAL(20,8) USING ROUND("newRate"::numeric, 8);

-- AlterTable
ALTER TABLE "account_receivables"
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2) USING ROUND("amount"::numeric, 2),
  ALTER COLUMN "amountUsd" SET DATA TYPE DECIMAL(20,2) USING ROUND("amountUsd"::numeric, 2),
  ALTER COLUMN "exchangeRateValue" SET DATA TYPE DECIMAL(20,8) USING ROUND("exchangeRateValue"::numeric, 8);

-- AlterTable
ALTER TABLE "account_payables"
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2) USING ROUND("amount"::numeric, 2),
  ALTER COLUMN "amountUsd" SET DATA TYPE DECIMAL(20,2) USING ROUND("amountUsd"::numeric, 2),
  ALTER COLUMN "exchangeRateValue" SET DATA TYPE DECIMAL(20,8) USING ROUND("exchangeRateValue"::numeric, 8);

-- AlterTable
ALTER TABLE "supplier_quotes"
  ALTER COLUMN "price" SET DATA TYPE DECIMAL(20,8) USING ROUND("price"::numeric, 8),
  ALTER COLUMN "priceUsd" SET DATA TYPE DECIMAL(20,8) USING ROUND("priceUsd"::numeric, 8),
  ALTER COLUMN "exchangeRateValue" SET DATA TYPE DECIMAL(20,8) USING ROUND("exchangeRateValue"::numeric, 8);

-- AlterTable
ALTER TABLE "purchases"
  ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(20,8) USING ROUND("unitCost"::numeric, 8),
  ALTER COLUMN "unitCostUsd" SET DATA TYPE DECIMAL(20,8) USING ROUND("unitCostUsd"::numeric, 8),
  ALTER COLUMN "exchangeRateValue" SET DATA TYPE DECIMAL(20,8) USING ROUND("exchangeRateValue"::numeric, 8);
