-- Fase 3 (dinero a Decimal), tanda 6: gastos y presupuestos, salarios
-- (empleados y ofertas de empleo), BNPL, planes y suscripciones.
-- Todos son montos: DECIMAL(20,2), con ROUND(::numeric, 2) sobre el histórico.

-- AlterTable
ALTER TABLE "expenses"
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2) USING ROUND("amount"::numeric, 2);

-- AlterTable
ALTER TABLE "expense_categories"
  ALTER COLUMN "budget" SET DATA TYPE DECIMAL(20,2) USING ROUND("budget"::numeric, 2);

-- AlterTable
ALTER TABLE "employees"
  ALTER COLUMN "salary" SET DATA TYPE DECIMAL(20,2) USING ROUND("salary"::numeric, 2);

-- AlterTable
ALTER TABLE "bnpl_transactions"
  ALTER COLUMN "amount" SET DATA TYPE DECIMAL(20,2) USING ROUND("amount"::numeric, 2);

-- AlterTable
ALTER TABLE "jobs"
  ALTER COLUMN "salaryMin" SET DATA TYPE DECIMAL(20,2) USING ROUND("salaryMin"::numeric, 2),
  ALTER COLUMN "salaryMax" SET DATA TYPE DECIMAL(20,2) USING ROUND("salaryMax"::numeric, 2);

-- AlterTable
ALTER TABLE "plans"
  ALTER COLUMN "price" SET DATA TYPE DECIMAL(20,2) USING ROUND("price"::numeric, 2),
  ALTER COLUMN "priceAnnual" SET DATA TYPE DECIMAL(20,2) USING ROUND("priceAnnual"::numeric, 2);

-- AlterTable
ALTER TABLE "subscriptions"
  ALTER COLUMN "pricePaid" SET DATA TYPE DECIMAL(20,2) USING ROUND("pricePaid"::numeric, 2);
