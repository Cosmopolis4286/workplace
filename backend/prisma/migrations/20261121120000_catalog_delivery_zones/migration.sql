-- AlterTable
ALTER TABLE "catalog_orders" ADD COLUMN     "deliveryFee" DECIMAL(20,2),
ADD COLUMN     "deliveryZone" TEXT;

-- AlterTable
ALTER TABLE "commerce_settings" ADD COLUMN     "deliveryZones" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "pickupEnabled" BOOLEAN NOT NULL DEFAULT true;


-- "Envío gratis desde" tenía 200 por defecto (legado de la versión en MXN):
-- en una tienda que cobra en Bs regalaba el envío desde 200 Bs. Ahora 0 =
-- nunca gratis; las filas que seguían con el valor de fábrica pasan a 0.
ALTER TABLE "commerce_settings" ALTER COLUMN "freeDeliveryMinimum" SET DEFAULT 0;
UPDATE "commerce_settings" SET "freeDeliveryMinimum" = 0 WHERE "freeDeliveryMinimum" = 200;
