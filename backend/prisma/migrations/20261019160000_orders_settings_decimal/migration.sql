-- Fase 3 (dinero a Decimal), tanda 7: pedidos, ítems, deliveries, clientes y
-- configuración del comercio. Montos a DECIMAL(20,2); porcentajes (IVA,
-- propina sugerida, márgenes) a DECIMAL(20,8). ROUND(::numeric, n) fija el histórico.

-- AlterTable
ALTER TABLE "commerce_settings"
  ALTER COLUMN "tax" SET DATA TYPE DECIMAL(20,8) USING ROUND("tax"::numeric, 8),
  ALTER COLUMN "suggestedTip" SET DATA TYPE DECIMAL(20,8) USING ROUND("suggestedTip"::numeric, 8),
  ALTER COLUMN "deliveryFee" SET DATA TYPE DECIMAL(20,2) USING ROUND("deliveryFee"::numeric, 2),
  ALTER COLUMN "freeDeliveryMinimum" SET DATA TYPE DECIMAL(20,2) USING ROUND("freeDeliveryMinimum"::numeric, 2),
  ALTER COLUMN "targetMarginPct" SET DATA TYPE DECIMAL(20,8) USING ROUND("targetMarginPct"::numeric, 8),
  ALTER COLUMN "minMarginPct" SET DATA TYPE DECIMAL(20,8) USING ROUND("minMarginPct"::numeric, 8);

-- AlterTable
ALTER TABLE "products"
  ALTER COLUMN "minMarginPct" SET DATA TYPE DECIMAL(20,8) USING ROUND("minMarginPct"::numeric, 8);

-- AlterTable
ALTER TABLE "customers"
  ALTER COLUMN "totalSpent" SET DATA TYPE DECIMAL(20,2) USING ROUND("totalSpent"::numeric, 2);

-- AlterTable
ALTER TABLE "deliveries"
  ALTER COLUMN "total" SET DATA TYPE DECIMAL(20,2) USING ROUND("total"::numeric, 2),
  ALTER COLUMN "deliveryFee" SET DATA TYPE DECIMAL(20,2) USING ROUND("deliveryFee"::numeric, 2);

-- AlterTable
ALTER TABLE "orders"
  ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(20,2) USING ROUND("subtotal"::numeric, 2),
  ALTER COLUMN "tax" SET DATA TYPE DECIMAL(20,2) USING ROUND("tax"::numeric, 2),
  ALTER COLUMN "deliveryFee" SET DATA TYPE DECIMAL(20,2) USING ROUND("deliveryFee"::numeric, 2),
  ALTER COLUMN "discount" SET DATA TYPE DECIMAL(20,2) USING ROUND("discount"::numeric, 2),
  ALTER COLUMN "total" SET DATA TYPE DECIMAL(20,2) USING ROUND("total"::numeric, 2);

-- AlterTable
ALTER TABLE "order_items"
  ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(20,2) USING ROUND("unitPrice"::numeric, 2),
  ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(20,2) USING ROUND("subtotal"::numeric, 2);
