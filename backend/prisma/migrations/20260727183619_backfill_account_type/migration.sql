-- Backfill: copiar el tipo de cuenta de negocio ya conocido desde `role`
-- hacia la nueva columna `accountType`. Aditivo y reversible (no borra ni
-- modifica `role`). Ver AccountTypeResolver para el fallback en runtime
-- mientras existan filas con accountType aún NULL.
UPDATE "users" SET "accountType" = 'COMMERCE'   WHERE "role" = 'COMMERCE'   AND "accountType" IS NULL;
UPDATE "users" SET "accountType" = 'FREELANCER' WHERE "role" = 'FREELANCER' AND "accountType" IS NULL;
