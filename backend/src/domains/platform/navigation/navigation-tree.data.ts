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
  { id: 'expenses', to: '/expenses', label: 'Gastos', icon: 'cash', order: 0,
    condition: { permission: 'expenses:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
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
      // Sin permission/módulo a propósito — cualquier usuario autenticado
      // (incluyendo NORMAL) puede buscar un servicio por lenguaje natural,
      // igual que ya puede hacerlo manualmente desde /search. Base sin LLM
      // del AI Agent orquestador (WORKPLACE_VISION.md §4/§16).
      { id: 'ai-assistant', to: '/ai-assistant', label: 'Asistente IA', icon: 'ai_assistant', order: -1,
        condition: { permission: null } },
      { id: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: 'dashboard', order: 0,
        condition: { permission: 'dashboard:view' } },
      { id: 'menu', to: '/menu', label: 'Menú', icon: 'menu', order: 1,
        condition: { permission: 'menu:view', requiresModule: true, excludeRoles: [Role.NORMAL], excludeAccountTypes: ['FREELANCER'] } },
      { id: 'inventory', to: '/inventory', label: 'Inventario', icon: 'inventory', order: 2,
        condition: { permission: 'inventory:view', requiresModule: true, excludeRoles: [Role.NORMAL], excludeAccountTypes: ['FREELANCER'] } },
      { id: 'my-services', to: '/my-services', label: 'Servicios', icon: 'services', order: 3,
        condition: { permission: 'services:view', requiresModule: true } },
      { id: 'service-requests', to: '/service-requests', label: 'Solicitudes', icon: 'requests', order: 4,
        condition: { permission: 'service_requests:view', requiresModule: true } },
      // Sin requiresModule a propósito: el punto de esta página es invitar a
      // alguien que TODAVÍA no tiene el módulo de servicios activo a
      // convertirse en proveedor — condicionarla al módulo la escondería
      // justo de quien más le sirve.
      { id: 'opportunities', to: '/opportunities', label: 'Oportunidades', icon: 'opportunities', order: 5,
        condition: { permission: 'opportunities:view' } },
      { id: 'rides', to: '/rides', label: 'Corridas y Fletes', icon: 'rides', order: 6,
        condition: { permission: 'corridas:view', requiresModule: true } },
      { id: 'wallet', to: '/wallet', label: 'Billetera', icon: 'wallet', order: 7,
        condition: { permission: 'wallets:use', requiresModule: true } },
      { id: 'my-orders', to: '/my-orders', label: 'Mis Pedidos', icon: 'orders', order: 8,
        condition: { permission: null, rolesOnly: [Role.NORMAL] } },
    ],
  },
  {
    id: 'sales',
    label: 'Ventas & Analytics',
    order: 1,
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
    order: 2,
    flat: false,
    items: [
      { id: 'orders', to: '/orders', label: 'Pedidos', icon: 'orders', order: 0,
        condition: { permission: 'orders:view', requiresModule: true, excludeRoles: [Role.NORMAL], excludeAccountTypes: ['FREELANCER'] } },
      { id: 'appointments', to: '/appointments', label: 'Agendamientos', icon: 'appointments', order: 1,
        condition: { permission: 'appointments:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
      { id: 'customers', to: '/customers', label: 'Clientes', icon: 'customers', order: 2,
        condition: { permission: 'customers:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
      { id: 'delivery', to: '/delivery', label: 'Delivery', icon: 'delivery', order: 3,
        condition: { permission: 'delivery:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
      { id: 'cash-register', to: '/cash-register', label: 'Caja', icon: 'cash', order: 4,
        condition: { permission: 'cash:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
      // Business Shield (WORKPLACE_VISION.md §4-12): costo de reposición,
      // comparación de proveedores y riesgo de reposición sobre fiado.
      { id: 'suppliers', to: '/suppliers', label: 'Proveedores', icon: 'suppliers', order: 5,
        condition: { permission: 'suppliers:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
      { id: 'purchases', to: '/purchases', label: 'Compras', icon: 'purchases', order: 6,
        condition: { permission: 'purchases:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
      { id: 'accounts', to: '/accounts', label: 'Cuentas por Cobrar/Pagar', icon: 'accounts', order: 7,
        condition: { permission: 'accounts:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
    ],
  },
  {
    id: 'company',
    label: 'Empresa',
    order: 3,
    flat: false,
    items: [
      { id: 'employees', to: '/employees', label: 'Empleados', icon: 'employees', order: 0,
        condition: { permission: 'employees:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
      // Movido desde la sección "top": conceptualmente es gestión de
      // personal (publicar/ver vacantes propias), igual que Empleados —
      // antes vivía suelto junto a Oportunidades sin relación visual.
      { id: 'jobs', to: '/jobs', label: 'Empleos', icon: 'jobs', order: 1,
        condition: { permission: 'jobs:view', requiresModule: true } },
      { id: 'branches', to: '/branches', label: 'Sucursales', icon: 'branches', order: 2,
        condition: { permission: 'branches:view', requiresModule: true, excludeAccountTypes: ['FREELANCER'] } },
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
    order: 4,
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
    order: 5,
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
    order: 6,
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
    order: 7,
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
    order: 8,
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
    order: 9,
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
