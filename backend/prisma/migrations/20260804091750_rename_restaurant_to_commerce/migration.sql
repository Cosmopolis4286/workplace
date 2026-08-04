-- Rename de tabla Restaurant -> Commerce y RestaurantSettings -> CommerceSettings.
-- El modelo se llamaba Restaurant por legado histórico (el proyecto originalmente
-- era solo para restaurantes); ningún campo es específico de comida (`type` ya
-- distingue el rubro), así que se renombra para reflejar lo que el dato ya
-- representa: cualquier tipo de comercio. Preserva filas y relaciones
-- existentes (RENAME, no recrea tablas). Postgres actualiza automáticamente
-- el target de las FKs en las 18 tablas dependientes (siguen apuntando al
-- mismo `id`, solo cambia el nombre de la tabla referenciada) — no hace
-- falta tocarlas.

-- Tabla restaurants -> commerces
ALTER TABLE "restaurants" RENAME TO "commerces";
ALTER TABLE "commerces" RENAME CONSTRAINT "restaurants_pkey" TO "commerces_pkey";
ALTER TABLE "commerces" RENAME CONSTRAINT "restaurants_userId_fkey" TO "commerces_userId_fkey";
ALTER INDEX "restaurants_avgRating_idx" RENAME TO "commerces_avgRating_idx";
ALTER INDEX "restaurants_userId_key" RENAME TO "commerces_userId_key";

-- Tabla restaurant_settings -> commerce_settings
ALTER TABLE "restaurant_settings" RENAME TO "commerce_settings";
ALTER TABLE "commerce_settings" RENAME CONSTRAINT "restaurant_settings_pkey" TO "commerce_settings_pkey";
ALTER TABLE "commerce_settings" RENAME CONSTRAINT "restaurant_settings_commerceId_fkey" TO "commerce_settings_commerceId_fkey";
ALTER INDEX "restaurant_settings_commerceId_key" RENAME TO "commerce_settings_commerceId_key";
