import { Role } from '@prisma/client';
import { NavItemDef, NavSectionDef } from './navigation.types';

/**
 * Rutas protegidas por permiso/módulo que NO tienen entrada propia en el
 * sidebar (se navega a ellas desde otro lugar de la UI — ej. un botón en
 * otra página), pero que los middlewares igual deben poder resolver vía
 * routePermissions/routeModules. No se renderizan: solo alimentan
 * NavigationService.getRouteMaps().
 */
export const EXTRA_PROTECTED_ROUTES: NavItemDef[] = [
  // excludeRoles SUPERADMIN/ADMIN: Gastos es de UN comercio (Commerce.id
  // real) — un admin no tiene Commerce propio, ver el mismo comentario en
  // la sección 'operations' más abajo para el detalle del bug que esto evita.
  { id: 'expenses', to: '/expenses', label: 'Gastos', icon: 'cash', order: 0,
    condition: { permission: 'expenses:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
  { id: 'customer-dashboard', to: '/customer-dashboard', label: 'Mi Panel', icon: 'dashboard', order: 0,
    condition: { permission: 'orders:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
];

/**
 * Fuente única de la estructura de navegación (sidebar). Traducción 1:1 de lo
 * que antes vivía hardcoded en frontend/components/SidebarContent.vue —
 * cualquier ítem de menú nuevo se agrega aquí, no en el frontend.
 */
export const NAVIGATION_TREE: NavSectionDef[] = [
  {
    id: 'top',
    label: null,
    order: 0,
    flat: true,
    items: [
      // Únicos ítems que quedan sueltos (sin agrupar): uso diario, no tiene
      // sentido esconderlos detrás de un acordeón. Todo lo demás que antes
      // vivía acá se movió a 'catalog'/'activity' (ver más abajo) — la
      // auditoría de sidebar encontró 9 ítems sueltos sin jerarquía en esta
      // sección al ser 'flat', causando la sensación de menú "sobrecargado".
      { id: 'ai-assistant', to: '/ai-assistant', label: 'Asistente IA', icon: 'ai_assistant', order: -1,
        condition: { permission: null } },
      { id: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard', order: 0,
        condition: { permission: 'dashboard:view' } },
    ],
  },
  {
    id: 'catalog',
    label: 'Mi Catálogo',
    order: 1,
    flat: false,
    items: [
      { id: 'menu', to: '/menu', label: 'Menú', icon: 'menu', order: 1,
        condition: { permission: 'menu:view', requiresModule: true, excludeRoles: [Role.NORMAL], excludeAccountTypes: ['FREELANCER'] } },
      { id: 'inventory', to: '/inventory', label: 'Inventario', icon: 'inventory', order: 2,
        condition: { permission: 'inventory:view', requiresModule: true, excludeRoles: [Role.NORMAL], excludeAccountTypes: ['FREELANCER'] } },
      { id: 'my-services', to: '/my-services', label: 'Servicios', icon: 'services', order: 3,
        condition: { permission: 'services:view', requiresModule: true } },
    ],
  },
  {
    id: 'activity',
    label: 'Mi Actividad',
    order: 2,
    flat: false,
    items: [
      { id: 'service-requests', to: '/service-requests', label: 'Solicitudes', icon: 'requests', order: 4,
        condition: { permission: 'service_requests:view', requiresModule: true } },
      // Sin requiresModule a propósito: el punto de esta página es invitar a
      // alguien que TODAVÍA no tiene el módulo de servicios activo a
      // convertirse en proveedor — condicionarla al módulo la escondería
      // justo de quien más le sirve.
      // excludeRoles SUPERADMIN/ADMIN en opportunities/rides: son acciones de
      // alguien que CONSUME la plataforma (buscar trabajo, pedir una
      // corrida/flete), no de quien la administra — opportunities:view/
      // corridas:view quedaban concedidos a estos roles solo por ser parte
      // de la unión total de permisos (SUPERADMIN) o de COMMERCE_KEYS
      // (ADMIN_KEYS), sin relación con su rol real de supervisión.
      { id: 'opportunities', to: '/opportunities', label: 'Oportunidades', icon: 'opportunities', order: 5,
        condition: { permission: 'opportunities:view', excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      { id: 'rides', to: '/rides', label: 'Corridas y Fletes', icon: 'rides', order: 6,
        condition: { permission: 'corridas:view', requiresModule: true, excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      { id: 'wallet', to: '/wallet', label: 'Billetera', icon: 'wallet', order: 7,
        condition: { permission: 'wallets:use', requiresModule: true } },
      { id: 'my-orders', to: '/my-orders', label: 'Mis Pedidos', icon: 'orders', order: 8,
        condition: { permission: null, rolesOnly: [Role.NORMAL] } },
    ],
  },
  {
    id: 'sales',
    label: 'Ventas & Analytics',
    order: 3,
    flat: false,
    items: [
      { id: 'sales', to: '/sales', label: 'Ventas', icon: 'sales', order: 0,
        condition: { permission: 'sales:view', requiresModule: true } },
      { id: 'analytics', to: '/analytics', label: 'Analytics', icon: 'analytics', order: 1,
        condition: { permission: 'analytics:view', requiresModule: true } },
      { id: 'reports', to: '/reports', label: 'Reportes', icon: 'reports', order: 2,
        condition: { permission: 'reports:view', requiresModule: true } },
    ],
  },
  {
    id: 'operations',
    label: 'Operaciones',
    order: 4,
    flat: false,
    items: [
      { id: 'orders', to: '/orders', label: 'Pedidos', icon: 'orders', order: 0,
        condition: { permission: 'orders:view', requiresModule: true, excludeRoles: [Role.NORMAL], excludeAccountTypes: ['FREELANCER'] } },
      // excludeRoles SUPERADMIN/ADMIN en appointments/delivery/cash-register/
      // suppliers/purchases/accounts/group-buying: son módulos de UN comercio
      // (Commerce.id real). Un admin no tiene Commerce propio — antes de este
      // fix, commerceResolver.resolve(adminUserId) hacía fallback silencioso a
      // adminUserId como "commerceId" (ver CommerceResolverService.resolve) y
      // estas páginas cargaban siempre vacías para un admin, sin error visible.
      // 'customers' y 'sales' se excluyen igual por ahora: tendrán una vista
      // agregada de plataforma propia (ver PlatformCustomersService/
      // PlatformSalesService) en vez de ocultarse permanentemente.
      { id: 'appointments', to: '/appointments', label: 'Agendamientos', icon: 'appointments', order: 1,
        condition: { permission: 'appointments:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      { id: 'customers', to: '/customers', label: 'Clientes', icon: 'customers', order: 2,
        condition: { permission: 'customers:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      { id: 'delivery', to: '/delivery', label: 'Delivery', icon: 'delivery', order: 3,
        condition: { permission: 'delivery:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      { id: 'cash-register', to: '/cash-register', label: 'Caja', icon: 'cash', order: 4,
        condition: { permission: 'cash:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      // Business Shield (WORKPLACE_VISION.md §4-12): costo de reposición,
      // comparación de proveedores y riesgo de reposición sobre fiado.
      { id: 'suppliers', to: '/suppliers', label: 'Proveedores', icon: 'suppliers', order: 5,
        condition: { permission: 'suppliers:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      { id: 'purchases', to: '/purchases', label: 'Compras', icon: 'purchases', order: 6,
        condition: { permission: 'purchases:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      { id: 'accounts', to: '/accounts', label: 'Cuentas por Cobrar/Pagar', icon: 'accounts', order: 7,
        condition: { permission: 'accounts:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      // Fase 3 (Network): reutiliza el permiso purchases:view — mismo modulo
      // habilitado por plan/categoria, sin agregar un tercer "techo" nuevo.
      { id: 'group-buying', to: '/group-buying', label: 'Compra Agrupada', icon: 'purchases', order: 8,
        condition: { permission: 'purchases:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
    ],
  },
  {
    id: 'company',
    label: 'Empresa',
    order: 5,
    flat: false,
    items: [
      { id: 'employees', to: '/employees', label: 'Empleados', icon: 'employees', order: 0,
        condition: { permission: 'employees:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
      // Movido desde la sección "top": conceptualmente es gestión de
      // personal (publicar/ver vacantes propias), igual que Empleados —
      // antes vivía suelto junto a Oportunidades sin relación visual.
      // requiresAnyModule: ['employees'] (no accountTypeOnly) — Role.NORMAL
      // tiene jobs:view en su matriz por diseño (ver seed.js, alta directa),
      // pero /jobs es "gestiona las vacantes que publicas": un freelancer
      // individual sin equipo (ej. un repartidor) tampoco tiene nada que
      // publicar ahí, aunque sea FREELANCER — se condiciona a que el plan
      // realmente incluya gestión de personal, igual criterio que Empleados.
      { id: 'jobs', to: '/jobs', label: 'Empleos', icon: 'jobs', order: 1,
        condition: { permission: 'jobs:view', requiresModule: true, requiresAnyModule: ['employees'] } },
      { id: 'branches', to: '/branches', label: 'Sucursales', icon: 'branches', order: 2,
        condition: { permission: 'branches:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'], excludeRoles: [Role.SUPERADMIN, Role.ADMIN] } },
    ],
  },
  // "Administración" se dividió en 4 secciones hermanas (antes 13 ítems
  // planos en una sola lista) para que cada bloque temático (personas,
  // catálogo, dinero, sistema) se pueda colapsar por separado desde el
  // frontend, en vez de un único acordeón largo — ver navigation.types.ts
  // NavSectionId y la auditoría de sidebar que motivó este cambio.
  {
    id: 'administration-people',
    label: 'Administración · Personas',
    order: 6,
    flat: false,
    items: [
      { id: 'admin-users', to: '/users', label: 'Usuarios', icon: 'users_admin', order: 0,
        condition: { permission: 'users:view' } },
      { id: 'admin-kyc', to: '/kyc-admin', label: 'Verificaciones KYC', icon: 'kyc', order: 1,
        condition: { permission: null, rolesOnly: [Role.SUPERADMIN, Role.ADMIN] } },
    ],
  },
  {
    id: 'administration-catalog',
    label: 'Administración · Catálogo',
    order: 7,
    flat: false,
    items: [
      { id: 'admin-categories', to: '/categories', label: 'Categorías', icon: 'categories', order: 0,
        condition: { permission: 'categories_global:view' } },
      { id: 'admin-search-tabs', to: '/search-tabs', label: 'Tabs de Búsqueda', icon: 'search_tabs', order: 1,
        condition: { permission: 'search_tabs:view' } },
      { id: 'admin-locations', to: '/locations', label: 'Ubicaciones (VE)', icon: 'locations', order: 2,
        condition: { permission: 'locations:view' } },
      { id: 'admin-proposed-categories', to: '/proposed-categories-admin', label: 'Categorías Propuestas', icon: 'categories', order: 3,
        condition: { permission: 'categories_user:manage' } },
    ],
  },
  {
    id: 'administration-money',
    label: 'Administración · Dinero',
    order: 8,
    flat: false,
    items: [
      { id: 'admin-plans', to: '/plans', label: 'Planes', icon: 'plan', order: 0,
        condition: { permission: 'plans:view' } },
      { id: 'admin-exchange-rates', to: '/exchange-rates', label: 'Tasas de Cambio', icon: 'analytics', order: 1,
        condition: { permission: 'exchange_rates:view' } },
      { id: 'admin-commissions', to: '/commissions', label: 'Comisiones', icon: 'commissions', order: 2,
        condition: { permission: 'platform_fees:view' } },
    ],
  },
  {
    id: 'administration-system',
    label: 'Administración · Sistema',
    order: 9,
    flat: false,
    items: [
      { id: 'admin-permissions', to: '/permissions', label: 'Permisos', icon: 'permissions', order: 0,
        condition: { permission: 'permissions:manage' } },
      { id: 'admin-landing', to: '/landing-admin', label: 'Landing', icon: 'home', order: 1,
        condition: { permission: null, rolesOnly: [Role.SUPERADMIN, Role.ADMIN] } },
      { id: 'admin-audit-log', to: '/audit-log', label: 'Auditoría', icon: 'audit', order: 2,
        condition: { permission: 'audit:view' } },
      { id: 'admin-logs', to: '/logs', label: 'Logs', icon: 'logs', order: 3,
        condition: { permission: 'logs:view' } },
    ],
  },
  {
    id: 'my-account',
    label: 'Mi Cuenta',
    order: 10,
    flat: false,
    items: [
      { id: 'profile', to: '/profile', label: 'Mi Perfil', icon: 'profile', order: 0,
        condition: { permission: null } },
      { id: 'verification', to: '/verification', label: 'Verificación de Identidad', icon: 'kyc', order: 1,
        condition: { permission: null } },
      { id: 'report-issue', to: '/report-issue', label: 'Reportar un Problema', icon: 'report_issue', order: 2,
        condition: { permission: null } },
    ],
  },
  {
    id: 'business',
    label: 'Negocio',
    order: 11,
    flat: false,
    items: [
      { id: 'settings', to: '/settings', label: 'Configuración', icon: 'ops_group', order: 0,
        condition: { permission: 'settings:view' } },
      { id: 'modules', to: '/modules', label: 'Módulos', icon: 'modules', order: 1,
        condition: { permission: null, accountTypeOnly: ['COMMERCE', 'FREELANCER'] } },
      { id: 'my-plan', to: '/my-plan', label: 'Mi Plan', icon: 'plan', order: 2,
        condition: { permission: null, accountTypeOnly: ['COMMERCE', 'FREELANCER'] } },
      { id: 'pricing', to: '/pricing', label: 'Planes y Precios', icon: 'pricing', order: 3,
        condition: { permission: null, excludeAccountTypes: ['COMMERCE', 'FREELANCER'] } },
    ],
  },
];
