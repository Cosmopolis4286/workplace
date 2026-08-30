/*
  Warnings:

  - Made the column `label` on table `system_modules` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "system_modules" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isBusinessModule" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSystemDefault" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "label" SET NOT NULL;

-- Backfill: SystemModule pasa a ser la fuente canónica del catálogo de
-- módulos (antes vivía hardcodeado en common/data/module-catalog.data.ts,
-- duplicado además en plan-limits.service.ts vía BUSINESS_MODULE_KEYS).
-- ON CONFLICT DO NOTHING porque algunas filas ya pueden existir (un admin
-- que uso el kill-switch antes de esta migración) — no se pisa su `enabled`.
INSERT INTO "system_modules" ("id", "module", "label", "isBusinessModule", "isSystemDefault", "enabled", "updatedAt")
VALUES
  (gen_random_uuid(), 'dashboard', 'Dashboard', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'menu', 'Menú', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'inventory', 'Inventario', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'orders', 'Pedidos', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'customers', 'Clientes', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'appointments', 'Agendamientos', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'delivery', 'Delivery', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'expenses', 'Gastos', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'analytics', 'Analytics', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'reports', 'Reportes', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'sales', 'Ventas', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'employees', 'Empleados', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'branches', 'Sucursales', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'settings', 'Configuración', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'notifications', 'Notificaciones', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'services', 'Servicios', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'service_requests', 'Solicitudes de servicio', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'jobs', 'Empleos', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'catalog', 'Catálogo', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'corridas', 'Corridas', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'wallets', 'Billetera', true, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'users', 'Usuarios', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'permissions', 'Permisos', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'audit', 'Auditoría', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'logs', 'Logs', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'plans', 'Planes', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'exchange_rates', 'Tasas de Cambio', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'platform_fees', 'Comisiones', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'search', 'Búsqueda', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'search_tabs', 'Tabs de Búsqueda', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'locations', 'Ubicaciones (VE)', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'categories_global', 'Categorías', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'categories_user', 'Categorías Propuestas', false, true, true, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'cash', 'Caja', false, true, true, CURRENT_TIMESTAMP)
ON CONFLICT ("module") DO NOTHING;
