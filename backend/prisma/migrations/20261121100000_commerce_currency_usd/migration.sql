-- La moneda por defecto de los comercios era MXN (legado de la versión
-- mexicana). El cobro directo solo admite USD o VES, así que todo comercio
-- que nunca cambió la moneda no podía recibir pagos. La tienda ya mostraba
-- esos precios con "$": se pasan a USD.
ALTER TABLE "commerce_settings" ALTER COLUMN "currency" SET DEFAULT 'USD';

UPDATE "commerce_settings" SET "currency" = 'USD' WHERE "currency" = 'MXN';
