-- El rol PROFESIONAL pasa a ser 100% derivado de los perfiles de negocio
-- (RoleResolverService.syncRoleForUser). Deja los datos coherentes:

-- 1) Huérfanos: rol PROFESIONAL sin NINGÚN perfil de negocio (cuentas
--    antiguas o editadas a mano). Se les crea el perfil que corresponde:
--    Comercio si ya tienen comercio interno, si no Profesional (autónomo).
INSERT INTO "user_profiles" ("id", "userId", "type", "subtype", "status", "categoryId", "subcategoryId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  u."id",
  CASE WHEN c."id" IS NOT NULL THEN 'BUSINESS'::"ProfileType" ELSE 'PROFESSIONAL'::"ProfileType" END,
  CASE WHEN c."id" IS NOT NULL THEN NULL ELSE 'FREELANCER'::"ProfessionalSubtype" END,
  'ACTIVE'::"ProfileStatus",
  u."categoryId",
  u."subcategoryId",
  NOW(),
  NOW()
FROM "users" u
LEFT JOIN "commerces" c ON c."userId" = u."id"
WHERE u."role" = 'PROFESIONAL'
  AND NOT EXISTS (
    SELECT 1 FROM "user_profiles" up
    WHERE up."userId" = u."id" AND up."type" IN ('BUSINESS', 'PROFESSIONAL')
  );

-- Vincula el comercio interno al perfil Comercio recién creado.
UPDATE "commerces" c
SET "profileId" = up."id"
FROM "user_profiles" up
WHERE c."profileId" IS NULL
  AND up."userId" = c."userId"
  AND up."type" = 'BUSINESS'
  AND up."status" = 'ACTIVE'
  AND NOT EXISTS (SELECT 1 FROM "commerces" c2 WHERE c2."profileId" = up."id");

-- 2) Rol PROFESIONAL con perfiles de negocio, pero ninguno activo → NORMAL
--    (lo mismo que ya hacía syncRoleForUser cuando se ejecutaba).
UPDATE "users" u
SET "role" = 'NORMAL'
WHERE u."role" = 'PROFESIONAL'
  AND NOT EXISTS (
    SELECT 1 FROM "user_profiles" up
    WHERE up."userId" = u."id" AND up."status" = 'ACTIVE'
      AND up."type" IN ('BUSINESS', 'PROFESSIONAL')
  );

-- 3) Perfil de negocio activo con rol NORMAL → PROFESIONAL.
UPDATE "users" u
SET "role" = 'PROFESIONAL'
WHERE u."role" = 'NORMAL'
  AND EXISTS (
    SELECT 1 FROM "user_profiles" up
    WHERE up."userId" = u."id" AND up."status" = 'ACTIVE'
      AND up."type" IN ('BUSINESS', 'PROFESSIONAL')
  );
