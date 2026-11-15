-- Techo de módulos propio por subcategoría (vacío = hereda el del rubro).
ALTER TABLE "user_subcategories" ADD COLUMN     "allowedModules" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Subcategorías que venden producto dentro de un rubro de servicios, y
-- Catering/Food Truck que además ofrecen servicios para eventos. Solo si el
-- admin no les definió un techo propio.
UPDATE "user_subcategories" SET "allowedModules" = ARRAY['dashboard', 'profile', 'menu', 'inventory', 'orders', 'customers', 'delivery', 'appointments', 'employees', 'branches', 'analytics', 'expenses', 'wallets', 'reports', 'sales', 'purchases', 'suppliers', 'accounts', 'services', 'service_requests']
WHERE "name" = 'Food Truck' AND cardinality("allowedModules") = 0
  AND "categoryId" IN (SELECT "id" FROM "user_categories" WHERE "name" = 'Comida');

UPDATE "user_subcategories" SET "allowedModules" = ARRAY['dashboard', 'profile', 'menu', 'inventory', 'orders', 'customers', 'delivery', 'appointments', 'employees', 'branches', 'analytics', 'expenses', 'wallets', 'reports', 'sales', 'purchases', 'suppliers', 'accounts', 'services', 'service_requests']
WHERE "name" = 'Catering' AND cardinality("allowedModules") = 0
  AND "categoryId" IN (SELECT "id" FROM "user_categories" WHERE "name" = 'Comida');

UPDATE "user_subcategories" SET "allowedModules" = ARRAY['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales', 'menu', 'inventory', 'orders', 'delivery', 'purchases', 'suppliers', 'accounts', 'employees', 'branches']
WHERE "name" = 'Venta de Autos' AND cardinality("allowedModules") = 0
  AND "categoryId" IN (SELECT "id" FROM "user_categories" WHERE "name" = 'Automotriz');

UPDATE "user_subcategories" SET "allowedModules" = ARRAY['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales', 'menu', 'inventory', 'orders', 'delivery', 'purchases', 'suppliers', 'accounts', 'employees', 'branches']
WHERE "name" = 'Accesorios' AND cardinality("allowedModules") = 0
  AND "categoryId" IN (SELECT "id" FROM "user_categories" WHERE "name" = 'Automotriz');

UPDATE "user_subcategories" SET "allowedModules" = ARRAY['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales', 'menu', 'inventory', 'orders', 'delivery', 'purchases', 'suppliers', 'accounts', 'employees', 'branches']
WHERE "name" = 'Neumáticos' AND cardinality("allowedModules") = 0
  AND "categoryId" IN (SELECT "id" FROM "user_categories" WHERE "name" = 'Automotriz');

UPDATE "user_subcategories" SET "allowedModules" = ARRAY['dashboard', 'profile', 'services', 'jobs', 'appointments', 'customers', 'service_requests', 'analytics', 'expenses', 'wallets', 'reports', 'sales', 'menu', 'inventory', 'orders', 'delivery', 'purchases', 'suppliers', 'accounts', 'employees', 'branches']
WHERE "name" = 'Tienda de Mascotas' AND cardinality("allowedModules") = 0
  AND "categoryId" IN (SELECT "id" FROM "user_categories" WHERE "name" = 'Mascotas');

-- Backfill: un PROFESSIONAL ACTIVE cuya subcategoría ahora vende producto
-- necesita su Commerce (misma regla que ensureForUser con el techo de la
-- subcategoría). Solo crea, nunca modifica comercios existentes.
INSERT INTO "commerces" ("id", "name", "userId", "profileId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  COALESCE(NULLIF(TRIM(p."pendingCommerceName"), ''), TRIM(u."firstName" || ' ' || u."lastName")),
  u."id",
  p."id",
  NOW(),
  NOW()
FROM "users" u
JOIN "user_subcategories" us ON us."id" = u."subcategoryId" AND us."categoryId" = u."categoryId"
JOIN LATERAL (
  SELECT up."id", up."pendingCommerceName"
  FROM "user_profiles" up
  WHERE up."userId" = u."id" AND up."status" = 'ACTIVE' AND up."type" = 'PROFESSIONAL'
  LIMIT 1
) p ON TRUE
WHERE us."allowedModules" && ARRAY['menu', 'inventory', 'orders']::text[]
  AND NOT EXISTS (SELECT 1 FROM "commerces" c WHERE c."userId" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "commerces" c2 WHERE c2."profileId" = p."id");

-- Inventario en todos los planes que venden producto: es otra vista del stock
-- que ya se maneja en Menú; los planes se diferencian por límites.
UPDATE "plans"
SET "enabledModules" = array_append("enabledModules", 'inventory')
WHERE 'menu' = ANY("enabledModules") AND NOT ('inventory' = ANY("enabledModules"));
