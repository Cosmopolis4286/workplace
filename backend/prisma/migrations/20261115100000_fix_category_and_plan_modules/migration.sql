-- Corrige techos de módulos que dejaban flujos rotos (solo datos, idempotente).
-- En producción el seed no pisa planes existentes, por eso va como migración.

-- 1) Categoría "Comercio": sin 'menu' no podía crear ni ver productos
--    (/menu/* exige el módulo) y la página de Inventario salía vacía.
UPDATE "user_categories"
SET "allowedModules" = array_append("allowedModules", 'menu')
WHERE "name" = 'Comercio' AND NOT ('menu' = ANY("allowedModules"));

-- 2) Categoría "Comida": reservas de mesa (Appointment.tableNumber).
UPDATE "user_categories"
SET "allowedModules" = array_append("allowedModules", 'appointments')
WHERE "name" = 'Comida' AND NOT ('appointments' = ANY("allowedModules"));

-- 3) Plan "Básico": subir desde Gratis quitaba Servicios y Solicitudes.
UPDATE "plans"
SET "enabledModules" = ARRAY(
  SELECT DISTINCT unnest("enabledModules" || ARRAY['services', 'service_requests', 'wallets'])
)
WHERE "name" = 'Básico';

-- 4) Proveedores, Compras y Cuentas se venden en los planes y los rubros pero
--    no tenían fila en system_modules: el admin no podía apagarlos ni
--    elegirlos al editar un plan.
INSERT INTO "system_modules" ("id", "module", "label", "isBusinessModule", "isSystemDefault", "enabled", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'suppliers', 'Proveedores', true, true, true, now()),
  (gen_random_uuid()::text, 'purchases', 'Compras', true, true, true, now()),
  (gen_random_uuid()::text, 'accounts', 'Cuentas por cobrar/pagar', true, true, true, now())
ON CONFLICT ("module") DO NOTHING;
