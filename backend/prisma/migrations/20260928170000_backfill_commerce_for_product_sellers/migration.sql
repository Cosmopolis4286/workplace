-- Backfill de Commerce para perfiles que lo exigen y no lo tienen. Misma
-- regla que CommerceResolverService.ensureForUser / shouldProvisionCommerce:
--   - perfil BUSINESS ACTIVE: siempre (PlansService.approveSubscription
--     activaba BUSINESS sin crear el Commerce);
--   - perfil PROFESSIONAL ACTIVE: si la categoría que gobierna sus módulos
--     (users.categoryId, la misma que usa PlanLimitsService) incluye un
--     módulo de venta de producto — menu/inventory/orders (decisión
--     "opción 2", 2026-09-28).
-- Hasta ahora esos usuarios solo obtenían un Commerce si abrían /menu o
-- Configuración (auto-creación silenciosa, eliminada). Solo crea, nunca
-- borra ni modifica comercios existentes.

INSERT INTO "commerces" ("id", "name", "userId", "profileId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  COALESCE(NULLIF(TRIM(p."pendingCommerceName"), ''), TRIM(u."firstName" || ' ' || u."lastName")),
  u."id",
  p."id",
  NOW(),
  NOW()
FROM "users" u
LEFT JOIN "user_categories" uc ON uc."id" = u."categoryId"
JOIN LATERAL (
  SELECT up."id", up."pendingCommerceName"
  FROM "user_profiles" up
  WHERE up."userId" = u."id"
    AND up."status" = 'ACTIVE'
    AND (
      up."type" = 'BUSINESS'
      OR (up."type" = 'PROFESSIONAL' AND uc."allowedModules" && ARRAY['menu', 'inventory', 'orders']::text[])
    )
  -- BUSINESS primero: si tiene ambos perfiles, el Commerce se vincula al de negocio.
  ORDER BY (up."type" = 'BUSINESS') DESC
  LIMIT 1
) p ON TRUE
WHERE NOT EXISTS (SELECT 1 FROM "commerces" c WHERE c."userId" = u."id")
  AND NOT EXISTS (SELECT 1 FROM "commerces" c2 WHERE c2."profileId" = p."id");
