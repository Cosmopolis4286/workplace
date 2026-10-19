-- Fase 3 (dinero a Decimal), tanda 8 (última): precios de productos,
-- servicios, catálogo, solicitudes de servicio, propuestas de cambio de precio
-- y viajes a DECIMAL(20,2). Product.cost es costo UNITARIO y va a
-- DECIMAL(20,8), igual que Purchase.unitCost (fracciones de centavo).

-- AlterTable
ALTER TABLE "products"
  ALTER COLUMN "price" SET DATA TYPE DECIMAL(20,2) USING ROUND("price"::numeric, 2),
  ALTER COLUMN "cost" SET DATA TYPE DECIMAL(20,8) USING ROUND("cost"::numeric, 8);

-- AlterTable
ALTER TABLE "catalog_orders"
  ALTER COLUMN "totalEstimate" SET DATA TYPE DECIMAL(20,2) USING ROUND("totalEstimate"::numeric, 2);

-- AlterTable
ALTER TABLE "catalog_order_items"
  ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(20,2) USING ROUND("unitPrice"::numeric, 2);

-- AlterTable
ALTER TABLE "services"
  ALTER COLUMN "price" SET DATA TYPE DECIMAL(20,2) USING ROUND("price"::numeric, 2);

-- AlterTable
ALTER TABLE "service_requests"
  ALTER COLUMN "price" SET DATA TYPE DECIMAL(20,2) USING ROUND("price"::numeric, 2);

-- AlterTable
ALTER TABLE "service_request_price_change_proposals"
  ALTER COLUMN "previousPrice" SET DATA TYPE DECIMAL(20,2) USING ROUND("previousPrice"::numeric, 2),
  ALTER COLUMN "proposedPrice" SET DATA TYPE DECIMAL(20,2) USING ROUND("proposedPrice"::numeric, 2),
  ALTER COLUMN "deltaAmount" SET DATA TYPE DECIMAL(20,2) USING ROUND("deltaAmount"::numeric, 2);

-- AlterTable
ALTER TABLE "rides"
  ALTER COLUMN "price" SET DATA TYPE DECIMAL(20,2) USING ROUND("price"::numeric, 2),
  ALTER COLUMN "declaredValue" SET DATA TYPE DECIMAL(20,2) USING ROUND("declaredValue"::numeric, 2);
