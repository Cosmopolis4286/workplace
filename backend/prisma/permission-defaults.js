// Defaults de la matriz de permisos — fuente única compartida por seed.js,
// scripts/simulate-permission-defaults.js y los tests de contrato
// (src/test/unit/permission-defaults.test.ts). Antes vivían inline en
// seed.js, así que nada fuera del seed podía verificar que la matriz real
// de la DB coincidiera con lo que el código asume.

const PERMISSIONS = [
  { key: 'dashboard:view',           module: 'dashboard',     action: 'view',           label: 'Ver Dashboard' },
  { key: 'menu:view',                module: 'menu',          action: 'view',           label: 'Ver Menú' },
  { key: 'menu:create',              module: 'menu',          action: 'create',         label: 'Crear productos y categorías' },
  { key: 'menu:edit',                module: 'menu',          action: 'edit',           label: 'Editar productos y categorías' },
  { key: 'menu:delete',              module: 'menu',          action: 'delete',         label: 'Eliminar productos y categorías' },
  { key: 'inventory:view',           module: 'inventory',     action: 'view',           label: 'Ver Inventario' },
  { key: 'inventory:edit',           module: 'inventory',     action: 'edit',           label: 'Editar stock' },
  { key: 'orders:view',              module: 'orders',        action: 'view',           label: 'Ver Pedidos' },
  { key: 'orders:create',            module: 'orders',        action: 'create',         label: 'Crear Pedidos' },
  { key: 'orders:edit',              module: 'orders',        action: 'edit',           label: 'Editar Pedidos' },
  { key: 'orders:delete',            module: 'orders',        action: 'delete',         label: 'Cancelar / Eliminar Pedidos' },
  { key: 'orders:change_status',     module: 'orders',        action: 'change_status',  label: 'Cambiar estado de Pedidos' },
  { key: 'customers:view',           module: 'customers',     action: 'view',           label: 'Ver Clientes' },
  { key: 'customers:create',         module: 'customers',     action: 'create',         label: 'Crear Clientes' },
  { key: 'customers:edit',           module: 'customers',     action: 'edit',           label: 'Editar Clientes' },
  { key: 'customers:delete',         module: 'customers',     action: 'delete',         label: 'Eliminar Clientes' },
  { key: 'appointments:view',        module: 'appointments',  action: 'view',           label: 'Ver Agendamientos' },
  { key: 'appointments:create',      module: 'appointments',  action: 'create',         label: 'Crear Agendamientos' },
  { key: 'appointments:edit',        module: 'appointments',  action: 'edit',           label: 'Editar Agendamientos' },
  { key: 'appointments:delete',      module: 'appointments',  action: 'delete',         label: 'Eliminar Agendamientos' },
  { key: 'delivery:view',            module: 'delivery',      action: 'view',           label: 'Ver Delivery' },
  { key: 'delivery:create',          module: 'delivery',      action: 'create',         label: 'Crear entregas' },
  { key: 'delivery:edit',            module: 'delivery',      action: 'edit',           label: 'Editar entregas' },
  { key: 'delivery:manage_drivers',  module: 'delivery',      action: 'manage_drivers', label: 'Gestionar repartidores' },
  { key: 'expenses:view',            module: 'expenses',      action: 'view',           label: 'Ver Gastos' },
  { key: 'expenses:create',          module: 'expenses',      action: 'create',         label: 'Crear Gastos' },
  { key: 'expenses:edit',            module: 'expenses',      action: 'edit',           label: 'Editar Gastos' },
  { key: 'expenses:delete',         module: 'expenses',      action: 'delete',         label: 'Eliminar Gastos' },
  { key: 'purchases:view',           module: 'purchases',     action: 'view',           label: 'Ver Compras' },
  { key: 'purchases:create',         module: 'purchases',     action: 'create',         label: 'Registrar Compras' },
  { key: 'purchases:delete',         module: 'purchases',     action: 'delete',         label: 'Eliminar Compras' },
  { key: 'accounts:view',            module: 'accounts',      action: 'view',           label: 'Ver Cuentas por Cobrar/Pagar' },
  { key: 'accounts:create',          module: 'accounts',      action: 'create',         label: 'Crear Cuentas por Cobrar/Pagar' },
  { key: 'accounts:edit',            module: 'accounts',      action: 'edit',           label: 'Marcar Cuentas como Pagadas' },
  { key: 'accounts:delete',          module: 'accounts',      action: 'delete',         label: 'Eliminar Cuentas por Cobrar/Pagar' },
  { key: 'cash:view',                module: 'cash',          action: 'view',           label: 'Ver Caja' },
  { key: 'cash:manage',              module: 'cash',          action: 'manage',         label: 'Gestionar Caja (abrir/cerrar/movimientos)' },
  { key: 'analytics:view',           module: 'analytics',     action: 'view',           label: 'Ver Analytics' },
  { key: 'reports:view',             module: 'reports',       action: 'view',           label: 'Ver Reportes' },
  { key: 'sales:view',               module: 'sales',         action: 'view',           label: 'Ver Ventas' },
  { key: 'employees:view',           module: 'employees',     action: 'view',           label: 'Ver Empleados' },
  { key: 'employees:create',         module: 'employees',     action: 'create',         label: 'Crear Empleados' },
  { key: 'employees:edit',           module: 'employees',     action: 'edit',           label: 'Editar Empleados' },
  { key: 'employees:delete',         module: 'employees',     action: 'delete',         label: 'Eliminar Empleados' },
  { key: 'branches:view',            module: 'branches',      action: 'view',           label: 'Ver Sucursales' },
  { key: 'branches:create',          module: 'branches',      action: 'create',         label: 'Crear Sucursales' },
  { key: 'branches:edit',            module: 'branches',      action: 'edit',           label: 'Editar Sucursales' },
  { key: 'branches:delete',          module: 'branches',      action: 'delete',         label: 'Eliminar Sucursales' },
  { key: 'suppliers:view',           module: 'suppliers',     action: 'view',           label: 'Ver Proveedores' },
  { key: 'suppliers:create',         module: 'suppliers',     action: 'create',         label: 'Crear Proveedores' },
  { key: 'suppliers:edit',           module: 'suppliers',     action: 'edit',           label: 'Editar Proveedores' },
  { key: 'suppliers:delete',         module: 'suppliers',     action: 'delete',         label: 'Eliminar Proveedores' },
  { key: 'settings:view',            module: 'settings',      action: 'view',           label: 'Ver Configuración' },
  { key: 'settings:edit',            module: 'settings',      action: 'edit',           label: 'Editar Configuración' },
  { key: 'notifications:view',       module: 'notifications', action: 'view',           label: 'Ver Notificaciones' },
  { key: 'services:view',            module: 'services',      action: 'view',           label: 'Ver Servicios' },
  { key: 'services:create',          module: 'services',      action: 'create',         label: 'Crear Servicios' },
  { key: 'services:edit',            module: 'services',      action: 'edit',           label: 'Editar Servicios' },
  { key: 'services:delete',          module: 'services',      action: 'delete',         label: 'Eliminar Servicios' },
  { key: 'service_requests:view',    module: 'service_requests', action: 'view',        label: 'Ver Solicitudes de Servicio' },
  { key: 'opportunities:view',       module: 'opportunities', action: 'view',           label: 'Ver Oportunidades' },
  { key: 'jobs:view',                module: 'jobs',           action: 'view',           label: 'Ver Empleos' },
  { key: 'jobs:create',              module: 'jobs',           action: 'create',         label: 'Crear Empleos' },
  { key: 'jobs:edit',                module: 'jobs',           action: 'edit',           label: 'Editar Empleos' },
  { key: 'jobs:delete',              module: 'jobs',           action: 'delete',         label: 'Eliminar Empleos' },
  { key: 'catalog:view',             module: 'catalog',       action: 'view',           label: 'Ver Catálogo (marketplace)' },
  { key: 'catalog:manage_orders',    module: 'catalog',       action: 'manage_orders',  label: 'Cambiar estado de pedidos de Catálogo' },
  // 🌍 Categorías y Subcategorías Globales (solo superadmin/admin)
  { key: 'categories_global:view',   module: 'categories_global', action: 'view_categories',   label: 'Ver Categorías Globales', isSystem: true },
  { key: 'categories_global:create', module: 'categories_global', action: 'create_categories', label: 'Crear Categorías Globales', isSystem: true },
  { key: 'categories_global:edit',   module: 'categories_global', action: 'edit_categories',   label: 'Editar Categorías Globales', isSystem: true },
  { key: 'categories_global:delete', module: 'categories_global', action: 'delete_categories', label: 'Eliminar Categorías Globales', isSystem: true },
  { key: 'subcategories_global:view',   module: 'categories_global', action: 'view_subcategories',   label: 'Ver Subcategorías Globales', isSystem: true },
  { key: 'subcategories_global:create', module: 'categories_global', action: 'create_subcategories', label: 'Crear Subcategorías Globales', isSystem: true },
  { key: 'subcategories_global:edit',   module: 'categories_global', action: 'edit_subcategories',   label: 'Editar Subcategorías Globales', isSystem: true },
  { key: 'subcategories_global:delete', module: 'categories_global', action: 'delete_subcategories', label: 'Eliminar Subcategorías Globales', isSystem: true },
  // 🏷️ Categorías propuestas por usuarios (pendientes de aprobación admin)
  { key: 'categories_user:propose', module: 'categories_user', action: 'propose', label: 'Proponer Categoría', isSystem: true },
  { key: 'categories_user:manage',  module: 'categories_user', action: 'manage',  label: 'Aprobar/Rechazar Categorías Propuestas', isSystem: true },
  { key: 'users:view',               module: 'users',         action: 'view',           label: 'Ver Usuarios',                isSystem: true },
  { key: 'users:manage',             module: 'users',         action: 'manage',         label: 'Gestionar Usuarios',          isSystem: true },
  { key: 'permissions:manage',       module: 'permissions',   action: 'manage',         label: 'Gestionar Matriz de Permisos', isSystem: true },
  { key: 'audit:view',               module: 'audit',         action: 'view',           label: 'Ver Auditoría',               isSystem: true },
  { key: 'logs:view',                module: 'logs',          action: 'view',           label: 'Ver Logs del Sistema',        isSystem: true },
  { key: 'plans:view',               module: 'plans',         action: 'view',           label: 'Ver Planes y Suscripciones',  isSystem: true },
  { key: 'plans:manage',             module: 'plans',         action: 'manage',         label: 'Gestionar Planes',            isSystem: true },
  { key: 'platform_fees:view',       module: 'platform_fees', action: 'view',           label: 'Ver Comisiones de Plataforma', isSystem: true },
  { key: 'platform_fees:manage',     module: 'platform_fees', action: 'manage',         label: 'Gestionar Comisiones de Plataforma', isSystem: true },
  { key: 'exchange_rates:view',      module: 'exchange_rates', action: 'view',          label: 'Ver Tasas de Cambio',         isSystem: true },
  { key: 'exchange_rates:manage',    module: 'exchange_rates', action: 'manage',        label: 'Gestionar Tasas de Cambio',   isSystem: true },
  { key: 'search:view',              module: 'search',         action: 'view',          label: 'Ver Búsqueda' },
  { key: 'corridas:view',            module: 'corridas',       action: 'view',          label: 'Ver Corridas' },
  { key: 'corridas:create',          module: 'corridas',       action: 'create',        label: 'Solicitar Corrida' },
  { key: 'corridas:manage',          module: 'corridas',       action: 'manage',        label: 'Gestionar Corridas (Conductor)' },
  { key: 'wallets:use',              module: 'wallets',        action: 'use',           label: 'Usar Billetera Digital' },
  { key: 'wallets:manage',           module: 'wallets',        action: 'manage',        label: 'Gestionar Billeteras (Admin)',  isSystem: true },
  { key: 'search_tabs:view',         module: 'search_tabs',    action: 'view',          label: 'Ver Tabs de Búsqueda',         isSystem: true },
  { key: 'search_tabs:manage',       module: 'search_tabs',    action: 'manage',        label: 'Gestionar Tabs de Búsqueda',   isSystem: true },
  { key: 'reviews:moderate',         module: 'reviews',        action: 'moderate',      label: 'Moderar Reseñas Reportadas',   isSystem: true },
  { key: 'locations:view',           module: 'locations',      action: 'view',          label: 'Ver Catálogo de Ubicaciones (VE)', isSystem: true },
  { key: 'locations:manage',         module: 'locations',      action: 'manage',        label: 'Gestionar Catálogo de Ubicaciones (VE)', isSystem: true },
  // Vistas agregadas de TODA la plataforma (todos los comercios/usuarios) —
  // ej. /orders/platform-stats, /orders/platform-recent. Deliberadamente
  // separado de orders:view/menu:view/etc: esos permisos siguen significando
  // "gestiono MI comercio" y SUPERADMIN/ADMIN no tienen uno propio (ver
  // ROLE_DEFAULTS más abajo, que los excluye a propósito). platform:monitor
  // es de solo lectura y agregado, nunca gatea escritura sobre datos de un
  // comercio específico.
  { key: 'platform:monitor',         module: 'platform',       action: 'monitor',       label: 'Monitorear flujo agregado de la plataforma', isSystem: true },
]

const COMMERCE_KEYS = [
  'dashboard:view',
  // inventory:view gatea la página /inventory en el sidebar (ver
  // navigation-tree.data.ts), pero los datos reales de esa página
  // (GET /menu/products y derivados) están protegidos por menu:view, no por
  // inventory:view — ambos deben concederse siempre juntos a cualquier
  // rol/perfil con acceso a Inventario, o la página cargará vacía con un
  // 403 silencioso. Ver auditoría de reportes que motivó este comentario.
  'menu:view', 'menu:create', 'menu:edit', 'menu:delete',
  'inventory:view', 'inventory:edit',
  'orders:view', 'orders:create', 'orders:edit', 'orders:delete', 'orders:change_status',
  'customers:view', 'customers:create', 'customers:edit', 'customers:delete',
  'appointments:view', 'appointments:create', 'appointments:edit', 'appointments:delete',
  'delivery:view', 'delivery:create', 'delivery:edit', 'delivery:manage_drivers',
  'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete',
  'purchases:view', 'purchases:create', 'purchases:delete',
  'accounts:view', 'accounts:create', 'accounts:edit', 'accounts:delete',
  'cash:view', 'cash:manage',
  'analytics:view', 'reports:view', 'sales:view',
  'employees:view', 'employees:create', 'employees:edit', 'employees:delete',
  'branches:view', 'branches:create', 'branches:edit', 'branches:delete',
  'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
  'settings:view', 'settings:edit',
  'notifications:view',
  'services:view', 'services:create', 'services:edit', 'services:delete',
  'service_requests:view',
  'opportunities:view',
  'jobs:view', 'jobs:create', 'jobs:edit', 'jobs:delete',
  'search:view',
  'corridas:view', 'corridas:create', 'corridas:manage',
  'wallets:use',
  'catalog:view', 'catalog:manage_orders',
]

// customers:/sales: se excluyen acá también (mismo criterio: un admin no
// tiene Commerce propio) pero ADMIN sigue recibiendo *:view de ambos más
// abajo — el resto de sus acciones (create/edit/delete) sí quedan afuera,
// porque la vista de plataforma es de solo lectura/monitoreo, nunca
// gestión de datos de un comercio ajeno (ver PlatformCustomersService /
// PlatformSalesService, gateados por platform:monitor, no por
// customers:view/sales:view).
const ADMIN_KEYS = COMMERCE_KEYS.filter(
  k => !k.startsWith('menu:') && !k.startsWith('inventory:') && !k.startsWith('services:') && !k.startsWith('service_requests:') && !k.startsWith('orders:') && !k.startsWith('jobs:')
    && !k.startsWith('appointments:') && !k.startsWith('delivery:') && !k.startsWith('cash:')
    && !k.startsWith('suppliers:') && !k.startsWith('purchases:') && !k.startsWith('accounts:')
    && !k.startsWith('employees:') && !k.startsWith('branches:') && !k.startsWith('expenses:')
    && !k.startsWith('customers:') && !k.startsWith('sales:')
)

// Kit de un proveedor de servicios independiente (Service/ServiceRequest):
// lo que TODO perfil profesional comparte. Antes se llamaba FREELANCER_KEYS.
const SERVICE_PROVIDER_KEYS = [
  'dashboard:view',
  'settings:view', 'settings:edit',
  'notifications:view',
  'services:view', 'services:create', 'services:edit', 'services:delete',
  'service_requests:view',
  'opportunities:view',
  'jobs:view', 'jobs:create', 'jobs:edit', 'jobs:delete',
  'analytics:view', 'reports:view',
  'search:view',
  'catalog:view',
  // corridas:manage habilita el rol de conductor: un profesional puede
  // ofrecer corridas/fletes como otro servicio más, con el mismo modelo de
  // comisión (sin escrow todavía) que el resto de las corridas.
  'corridas:view', 'corridas:create', 'corridas:manage',
  'wallets:use',
  'categories_user:propose',
]

// Kit de venta de producto físico (decisión de producto 2026-09-28, "opción
// 2"): un PROFESSIONAL puede vender producto sin activar un perfil BUSINESS.
// El permiso dice "este papel PUEDE hacer esto"; quién lo USA de verdad lo
// decide la categoría (UserCategory.allowedModules ∩ plan, vía
// ModuleAccessGuard) — un profesional de "Comida" tiene el módulo, uno de
// "Tecnología" no. Son exactamente los módulos cuyo controller usa
// @RequireModule (menu/orders/customers/delivery/expenses) + inventory
// (gatea /inventory, sus datos viven bajo menu:*) + sales:view (/sales) +
// catalog:manage_orders (pedidos del catálogo público llegan al Commerce).
const PRODUCT_SELLER_KEYS = [
  'menu:view', 'menu:create', 'menu:edit', 'menu:delete',
  'inventory:view', 'inventory:edit',
  'orders:view', 'orders:create', 'orders:edit', 'orders:delete', 'orders:change_status',
  'customers:view', 'customers:create', 'customers:edit', 'customers:delete',
  'delivery:view', 'delivery:create', 'delivery:edit', 'delivery:manage_drivers',
  'expenses:view', 'expenses:create', 'expenses:edit', 'expenses:delete',
  'sales:view',
  'catalog:manage_orders',
]

const uniq = (keys) => Array.from(new Set(keys))

const BUSINESS_PROFILE_KEYS = uniq([...COMMERCE_KEYS, 'categories_user:propose'])
const PROFESSIONAL_PROFILE_KEYS = uniq([...SERVICE_PROVIDER_KEYS, ...PRODUCT_SELLER_KEYS])

// Lo que cada papel de negocio concede (ProfilePermission). Es la ÚNICA
// fuente de la distinción comercio vs. profesional: un permiso que solo
// BUSINESS tiene (employees, branches, cash, purchases, suppliers, accounts,
// appointments) nunca llega a un PROFESSIONAL, y `can(permiso)` en el
// frontend ya dice la verdad sin listas de accountType.
const PROFILE_PERMISSION_DEFAULTS = [
  { profileType: 'BUSINESS', subtype: null, keys: BUSINESS_PROFILE_KEYS },
  { profileType: 'PROFESSIONAL', subtype: 'FREELANCER', keys: PROFESSIONAL_PROFILE_KEYS },
  { profileType: 'PROFESSIONAL', subtype: 'SERVICE_PROVIDER', keys: PROFESSIONAL_PROFILE_KEYS },
]

// role=PROFESIONAL es solo NIVEL de acceso: concede la intersección de todos
// los perfiles de negocio (lo que cualquier profesional comparte), nunca la
// unión. Antes era la unión, así que ProfilePermission no podía restringir
// nada (hasEffectivePermission = rol ∪ perfiles) y cada capa del frontend
// parcheaba con listas de excludeAccountTypes. Se calcula, no se escribe a
// mano, para que no pueda divergir de PROFILE_PERMISSION_DEFAULTS.
const PROFESIONAL_BASE_KEYS = PROFILE_PERMISSION_DEFAULTS
  .map(p => p.keys)
  .reduce((acc, keys) => acc.filter(k => keys.includes(k)))

const ROLE_DEFAULTS = {
  // Mismo criterio que ADMIN_KEYS: SUPERADMIN tampoco tiene un Commerce
  // propio. customers:/sales: quedan afuera también — SUPERADMIN monitorea
  // esos datos vía platform:monitor (PlatformCustomersService/
  // PlatformSalesService), no vía los permisos por-comercio.
  SUPERADMIN: PERMISSIONS.map(p => p.key).filter(k =>
    !k.startsWith('services:') && !k.startsWith('service_requests:') && !k.startsWith('orders:') && !k.startsWith('jobs:')
    && !k.startsWith('appointments:') && !k.startsWith('delivery:') && !k.startsWith('cash:')
    && !k.startsWith('suppliers:') && !k.startsWith('purchases:') && !k.startsWith('accounts:')
    && !k.startsWith('employees:') && !k.startsWith('branches:') && !k.startsWith('expenses:')
    && !k.startsWith('customers:') && !k.startsWith('sales:')
  ),
  ADMIN: [
    ...ADMIN_KEYS,
    'users:view', 'users:manage',
    'plans:view', 'exchange_rates:view', 'platform_fees:view',
    // Permisos para categorías globales
    'categories_global:view',
    'categories_global:create',
    'categories_global:edit',
    'categories_global:delete',
    'subcategories_global:view',
    'subcategories_global:create',
    'subcategories_global:edit',
    'subcategories_global:delete',
    'wallets:use', 'wallets:manage',
    'search_tabs:view', 'search_tabs:manage',
    'reviews:moderate',
    'categories_user:manage',
    'locations:view', 'locations:manage',
    'platform:monitor',
  ],
  PROFESIONAL: PROFESIONAL_BASE_KEYS,
  NORMAL: ['catalog:view', 'notifications:view', 'service_requests:view', 'opportunities:view', 'jobs:view', 'jobs:create', 'jobs:edit', 'jobs:delete', 'dashboard:view', 'corridas:view', 'corridas:create', 'orders:view', 'wallets:use'],
}

module.exports = {
  PERMISSIONS,
  COMMERCE_KEYS,
  SERVICE_PROVIDER_KEYS,
  PRODUCT_SELLER_KEYS,
  BUSINESS_PROFILE_KEYS,
  PROFESSIONAL_PROFILE_KEYS,
  PROFILE_PERMISSION_DEFAULTS,
  PROFESIONAL_BASE_KEYS,
  ROLE_DEFAULTS,
}
