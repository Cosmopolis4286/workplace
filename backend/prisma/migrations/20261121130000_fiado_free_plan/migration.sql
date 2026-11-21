-- Fiado (cuentas por cobrar) en el plan gratuito y para el autónomo que vende.
-- En las bodegas y ventas de comida de Casacoima el fiado es el día a día.

-- 1) Plan(es) gratuito(s): módulo 'accounts'.
UPDATE "plans"
SET "enabledModules" = array_append("enabledModules", 'accounts')
WHERE "price" = 0 AND NOT ('accounts' = ANY("enabledModules"));

-- 2) Perfil PROFESSIONAL (FREELANCER y SERVICE_PROVIDER): permisos de fiado.
--    El techo sigue siendo el rubro: solo los rubros que venden producto
--    (Comida, Comercio, subcategorías de venta) traen el módulo.
INSERT INTO "profile_permissions" ("id", "profileType", "subtype", "permissionId", "granted", "updatedAt")
SELECT gen_random_uuid()::text, 'PROFESSIONAL'::"ProfileType", s.subtype::"ProfessionalSubtype", p."id", true, NOW()
FROM "permissions" p
CROSS JOIN (VALUES ('FREELANCER'), ('SERVICE_PROVIDER')) AS s(subtype)
WHERE p."key" IN ('accounts:view', 'accounts:create', 'accounts:edit', 'accounts:delete')
ON CONFLICT ("profileType", "subtype", "permissionId") DO NOTHING;
