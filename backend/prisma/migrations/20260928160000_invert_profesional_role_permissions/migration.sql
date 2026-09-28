-- Invierte la matriz de role=PROFESIONAL: de UNIÓN (comercio ∪ profesional)
-- a BASE COMÚN (intersección). La distinción comercio vs. profesional pasa a
-- vivir solo en profile_permissions. Fuente de los valores:
-- prisma/permission-defaults.js (BUSINESS_PROFILE_KEYS vs.
-- PROFESSIONAL_PROFILE_KEYS). Simulado antes de aplicar con
-- scripts/simulate-permission-defaults.js.
--
-- Solo toca las claves listadas: cualquier otro ajuste que un admin haya
-- hecho desde la matriz se conserva. Los overrides individuales
-- (user_permissions) no se tocan y siguen mandando sobre ambas fuentes.
-- En una DB sin permisos sembrados todavía, los UPDATE no afectan filas y el
-- seed crea la matriz ya con los defaults nuevos.

-- 1) role=PROFESIONAL deja de conceder los permisos exclusivos de BUSINESS.
UPDATE "role_permissions" rp
SET "granted" = false, "updatedAt" = NOW(), "updatedBy" = 'migration:invert_profesional_role_permissions'
FROM "permissions" p
WHERE rp."permissionId" = p."id"
  AND rp."role" = 'PROFESIONAL'
  AND p."key" IN (
    'appointments:view', 'appointments:create', 'appointments:edit', 'appointments:delete',
    'purchases:view', 'purchases:create', 'purchases:delete',
    'accounts:view', 'accounts:create', 'accounts:edit', 'accounts:delete',
    'cash:view', 'cash:manage',
    'employees:view', 'employees:create', 'employees:edit', 'employees:delete',
    'branches:view', 'branches:create', 'branches:edit', 'branches:delete',
    'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete'
  );

-- 2) Perfil PROFESSIONAL (ambos subtipos) recibe el kit de venta de producto
--    (decisión 2026-09-28, "opción 2"): quién lo usa de verdad lo decide la
--    categoría vía ModuleAccessGuard, no el permiso. Crea las filas que falten
--    y marca granted=true en las existentes.
INSERT INTO "profile_permissions" ("id", "profileType", "subtype", "permissionId", "granted", "updatedAt", "updatedBy")
SELECT gen_random_uuid()::text, 'PROFESSIONAL'::"ProfileType", s.subtype::"ProfessionalSubtype", p."id", true, NOW(),
       'migration:invert_profesional_role_permissions'
FROM "permissions" p
CROSS JOIN (VALUES ('FREELANCER'), ('SERVICE_PROVIDER')) AS s(subtype)
WHERE p."key" IN (
    'menu:view', 'menu:create', 'menu:edit', 'menu:delete',
    'inventory:view', 'inventory:edit',
    'orders:view', 'orders:create', 'orders:edit', 'orders:delete', 'orders:change_status',
    'customers:view', 'customers:create', 'customers:edit', 'customers:delete',
    'delivery:view', 'delivery:create', 'delivery:edit', 'delivery:manage_drivers',
    'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete',
    'sales:view',
    'catalog:manage_orders'
  )
ON CONFLICT ("profileType", "subtype", "permissionId")
DO UPDATE SET "granted" = true, "updatedAt" = NOW(), "updatedBy" = EXCLUDED."updatedBy";
