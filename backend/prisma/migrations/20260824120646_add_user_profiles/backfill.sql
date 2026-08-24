-- Backfill de UserProfile para usuarios de negocio existentes.
-- No es parte de la migración de schema (Prisma no ejecuta este archivo
-- automáticamente) — se corre una sola vez, a mano, después de aplicar
-- 20260824120646_add_user_profiles/migration.sql. Ver WORKPLACE_VISION.md.

BEGIN;

-- 1) Un UserProfile BUSINESS por cada Commerce existente, y vincula
--    commerces.profileId al nuevo perfil.
WITH new_profiles AS (
  INSERT INTO user_profiles (id, "userId", type, status, "createdAt", "updatedAt")
  SELECT gen_random_uuid(), c."userId", 'BUSINESS', 'ACTIVE', c."createdAt", now()
  FROM commerces c
  WHERE c."profileId" IS NULL
  RETURNING id, "userId"
)
UPDATE commerces c
SET "profileId" = np.id
FROM new_profiles np
WHERE c."userId" = np."userId"
  AND c."profileId" IS NULL;

-- 2) Un UserProfile PROFESSIONAL (subtype FREELANCER) por cada usuario con
--    accountType/role FREELANCER que todavía no tenga uno.
INSERT INTO user_profiles (id, "userId", type, subtype, status, "createdAt", "updatedAt")
SELECT gen_random_uuid(), u.id, 'PROFESSIONAL', 'FREELANCER', 'ACTIVE', u."createdAt", now()
FROM users u
WHERE (u.role = 'FREELANCER' OR u."accountType" = 'FREELANCER')
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up."userId" = u.id AND up.type = 'PROFESSIONAL'
  );

-- 3) Un UserProfile BUSINESS por cada usuario con accountType/role COMMERCE
--    que todavía no tenga uno (cubre COMMERCE sin fila en `commerces`, si
--    los hubiera).
INSERT INTO user_profiles (id, "userId", type, status, "createdAt", "updatedAt")
SELECT gen_random_uuid(), u.id, 'BUSINESS', 'ACTIVE', u."createdAt", now()
FROM users u
WHERE (u.role = 'COMMERCE' OR u."accountType" = 'COMMERCE')
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up."userId" = u.id AND up.type = 'BUSINESS'
  );

-- 4) Un UserProfile CUSTOMER para todo usuario NORMAL (cliente por
--    defecto) que aún no tenga uno — refleja que hoy cualquier usuario
--    NORMAL ya puede comprar/contratar sin activar nada.
INSERT INTO user_profiles (id, "userId", type, status, "createdAt", "updatedAt")
SELECT gen_random_uuid(), u.id, 'CUSTOMER', 'ACTIVE', u."createdAt", now()
FROM users u
WHERE u.role = 'NORMAL'
  AND NOT EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up."userId" = u.id AND up.type = 'CUSTOMER'
  );

COMMIT;
