-- Backfill: poblar los cachés desnormalizados agregados en la migración
-- anterior (add_denormalized_rating_and_sales_counts) a partir de los datos
-- ya existentes en reviews/catalog_orders. Aditivo, no destructivo — de aquí
-- en más ProfilesService/CatalogService mantienen estas columnas al día en
-- cada write (ver ProfilesService.recalculateCommerceRating y
-- CatalogService.createOrder).

-- avgRating / reviewsCount: promedio de reviews NO ocultas recibidas por el
-- dueño (userId) de cada comercio.
UPDATE "restaurants" r
SET
  "avgRating" = agg.avg_rating,
  "reviewsCount" = agg.reviews_count
FROM (
  SELECT
    "targetId",
    AVG("rating")::double precision AS avg_rating,
    COUNT(*)::int AS reviews_count
  FROM "reviews"
  WHERE "isHidden" = false
  GROUP BY "targetId"
) agg
WHERE r."userId" = agg."targetId";

-- salesCount: suma de quantity de todos los CatalogOrder por producto.
-- productId no tiene FK declarada (el pedido sobrevive si se borra el
-- producto), así que el join es por igualdad de string, no por relación.
UPDATE "products" p
SET "salesCount" = agg.total_quantity
FROM (
  SELECT
    "productId",
    SUM("quantity")::int AS total_quantity
  FROM "catalog_orders"
  GROUP BY "productId"
) agg
WHERE p."id" = agg."productId";
