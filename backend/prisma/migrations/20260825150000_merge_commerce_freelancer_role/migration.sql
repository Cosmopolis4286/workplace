-- Fusiona Role.COMMERCE + Role.FREELANCER en Role.PROFESIONAL.
-- Postgres no permite renombrar/quitar valores de un enum en uso
-- directamente, así que se crea el tipo nuevo, se migran las columnas, y se
-- reemplaza el tipo viejo.

-- 1. Nuevo tipo con los 4 valores finales.
CREATE TYPE "Role_new" AS ENUM ('SUPERADMIN', 'ADMIN', 'PROFESIONAL', 'NORMAL');

-- 2. Migrar users.role: COMMERCE y FREELANCER colapsan a PROFESIONAL.
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING (
  CASE "role"::text
    WHEN 'COMMERCE' THEN 'PROFESIONAL'
    WHEN 'FREELANCER' THEN 'PROFESIONAL'
    ELSE "role"::text
  END
)::"Role_new";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'NORMAL';

-- 3. role_permissions: PROFESIONAL debe llevar solo la INTERSECCIÓN de lo
-- que hoy tienen COMMERCE y FREELANCER (lo específico de cada uno ya vive
-- en profile_permissions, migrado en 20260824193302_add_profile_permissions
-- — ver comentario del enum Role en schema.prisma). Se calcula antes de
-- migrar el tipo de la columna, usando el enum viejo todavía vigente.
CREATE TEMP TABLE "role_permissions_intersection" AS
  SELECT "permissionId", bool_and("granted") as granted
  FROM "role_permissions"
  WHERE "role" IN ('COMMERCE', 'FREELANCER')
  GROUP BY "permissionId"
  HAVING count(*) = 2;

-- Elimina las filas COMMERCE/FREELANCER (con su FK a permissions) antes de
-- cambiar el tipo de la columna.
DELETE FROM "role_permissions" WHERE "role" IN ('COMMERCE', 'FREELANCER');

ALTER TABLE "role_permissions" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text)::"Role_new";

-- Inserta PROFESIONAL con la intersección calculada (upsert por si ya
-- existiera alguna fila PROFESIONAL de una corrida previa).
INSERT INTO "role_permissions" ("id", "role", "permissionId", "granted", "updatedAt")
SELECT gen_random_uuid(), 'PROFESIONAL', "permissionId", "granted", now()
FROM "role_permissions_intersection"
ON CONFLICT ("role", "permissionId") DO UPDATE SET "granted" = EXCLUDED."granted";

DROP TABLE "role_permissions_intersection";

-- 4. Reemplazar el tipo viejo por el nuevo.
DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";
