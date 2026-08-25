-- Reemplaza el campo único "image" (URL externa, sin blindar) por un array
-- "images" (0 = principal, 1-2 = secundarias) que solo contiene rutas propias
-- servidas por el backend tras subir el archivo o importar la URL de forma segura.
ALTER TABLE "services" ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "services" SET "images" = ARRAY["image"] WHERE "image" IS NOT NULL AND "image" <> '';

ALTER TABLE "services" DROP COLUMN "image";
