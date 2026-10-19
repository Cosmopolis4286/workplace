// @ts-nocheck - Este archivo es de configuración, no necesita imports de Vue
import type { Component } from 'vue'
import type { Capability } from '~/composables/auth/useAuth'

// Tipos de roles disponibles en el sistema. role solo dice NIVEL de acceso;
// lo que distingue "opera un Commerce" de "ofrece servicios" son las
// capacidades (GET /auth/me → capabilities, mismas que exigen los guards del
// backend). Antes era accountType (COMMERCE|FREELANCER), que colapsaba
// perfiles y no sabía si existía el Commerce: un profesional que vende
// producto ("opción 2") tiene Commerce sin ser BUSINESS.
export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'PROFESIONAL' | 'NORMAL'
export type HasCapability = (capability: Capability) => boolean

// Configuración de widgets del dashboard
export interface WidgetConfig {
  id: string
  name: string
  component: string
  roles: UserRole[]
  // Filtro adicional para role=PROFESIONAL: debe tener TODAS estas
  // capacidades. No aplica a SUPERADMIN/ADMIN/NORMAL.
  capabilities?: Capability[]
  // Filtro adicional: módulo real (useModules().hasModule) requerido para
  // ver este widget — tener perfil profesional no implica tener 'services'
  // habilitado (depende de UserCategory.allowedModules × plan). Sin esto, un
  // profesional de un rubro sin ese módulo veía un widget inaccesible.
  requiresModule?: string
  permissions?: string[]
  priority: number
  defaultVisible: boolean
  gridCols?: 1 | 2 | 3 | 4 // Columnas que ocupa en el grid
  description?: string
}

// Configuración de acciones rápidas
export interface QuickActionConfig {
  id: string
  name: string
  icon: string
  route: string
  roles: UserRole[]
  capabilities?: Capability[]
  // Ver WidgetConfig.requiresModule — mismo motivo.
  requiresModule?: string
  permissions?: string[]
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'teal' | 'indigo' | 'orange'
  description?: string
}

// Mensajes de bienvenida por rol
export interface HeroConfig {
  roles: UserRole[]
  capabilities?: Capability[]
  title: string
  subtitle: string
  icon: string
  gradient: string
}

// WIDGETS DEL DASHBOARD
export const DASHBOARD_WIDGETS: WidgetConfig[] = [
  // SUPERADMIN - Todo el sistema
  {
    id: 'salesToday',
    name: 'Ventas Hoy',
    component: 'SalesTodayWidget',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    priority: 1,
    defaultVisible: true,
    gridCols: 1,
    description: 'Muestra las ventas/ingresos del día con comparativa',
  },
  {
    id: 'activeOrders',
    name: 'Pedidos Activos',
    component: 'ActiveOrdersWidget',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    capabilities: ['HAS_COMMERCE'],
    priority: 2,
    defaultVisible: true,
    gridCols: 1,
    description: 'Cantidad de pedidos en curso',
  },
  {
    id: 'lowStock',
    name: 'Bajo Stock',
    component: 'LowStockWidget',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    capabilities: ['HAS_COMMERCE'],
    priority: 3,
    defaultVisible: true,
    gridCols: 1,
    description: 'Productos con stock bajo',
  },
  {
    id: 'newCustomers',
    name: 'Clientes Nuevos',
    component: 'NewCustomersWidget',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    priority: 4,
    defaultVisible: true,
    gridCols: 1,
    description: 'Clientes/contactos nuevos registrados',
  },
  {
    id: 'ordersList',
    name: 'Lista de Pedidos',
    component: 'OrdersListWidget',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    capabilities: ['HAS_COMMERCE'],
    priority: 5,
    defaultVisible: true,
    gridCols: 2,
    description: 'Lista detallada de pedidos activos',
  },
  // Solicitudes activas: freelancer usa este widget en vez de activeOrders
  // (mismo componente ActiveOrdersWidget con label 'Solicitudes activas' y
  // datos de ServiceRequest en vez de Order).
  {
    id: 'activeServiceRequests',
    name: 'Solicitudes Activas',
    component: 'ActiveOrdersWidget',
    roles: ['PROFESIONAL'],
    capabilities: ['HAS_PROFESSIONAL_PROFILE'],
    requiresModule: 'services',
    priority: 2,
    defaultVisible: true,
    gridCols: 1,
    description: 'Cantidad de solicitudes de servicio en curso',
  },
  {
    id: 'providerServiceRequests',
    name: 'Solicitudes Recibidas',
    component: 'ProviderServiceRequestsWidget',
    roles: ['PROFESIONAL'],
    capabilities: ['HAS_PROFESSIONAL_PROFILE'],
    requiresModule: 'services',
    priority: 5,
    defaultVisible: true,
    gridCols: 2,
    description: 'Lista de solicitudes de servicio recibidas de clientes',
  },
  {
    id: 'systemHealth',
    name: 'Estado del Sistema',
    component: 'SystemHealthWidget',
    roles: ['SUPERADMIN'],
    priority: 6,
    defaultVisible: false,
    gridCols: 2,
    description: 'Métricas de salud del sistema',
  },
  {
    id: 'analyticsOverview',
    name: 'Resumen Analytics',
    component: 'AnalyticsOverviewWidget',
    roles: ['SUPERADMIN', 'ADMIN'],
    priority: 7,
    defaultVisible: true,
    gridCols: 3,
    description: 'Métricas clave de rendimiento',
  },
  {
    id: 'myOrders',
    name: 'Mis Pedidos',
    component: 'MyOrdersWidget',
    roles: ['NORMAL'],
    priority: 1,
    defaultVisible: true,
    gridCols: 2,
    description: 'Pedidos del cliente',
  },
  {
    id: 'myServiceRequests',
    name: 'Mis Solicitudes de Servicio',
    component: 'MyServiceRequestsWidget',
    roles: ['NORMAL'],
    priority: 2,
    defaultVisible: true,
    gridCols: 2,
    description: 'Solicitudes de servicio enviadas',
  },
  {
    id: 'recentActivity',
    name: 'Actividad Reciente',
    component: 'RecentActivityWidget',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    priority: 8,
    defaultVisible: true,
    gridCols: 2,
    description: 'Actividad reciente del usuario',
  },
]

// ACCIONES RÁPIDAS
export const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: 'viewOrders',
    name: 'Ver Pedidos',
    icon: 'ShoppingCartIcon',
    route: '/customer-dashboard',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    capabilities: ['HAS_COMMERCE'],
    requiresModule: 'orders',
    color: 'blue',
    description: 'Gestión de pedidos',
  },
  {
    id: 'manageServices',
    name: 'Mis Servicios',
    icon: 'WrenchIcon',
    route: '/my-services',
    roles: ['PROFESIONAL'],
    capabilities: ['HAS_PROFESSIONAL_PROFILE'],
    requiresModule: 'services',
    color: 'blue',
    description: 'Gestionar los servicios que ofreces',
  },
  {
    id: 'manageJobs',
    name: 'Mis Empleos',
    icon: 'BriefcaseIcon',
    route: '/jobs',
    roles: ['PROFESIONAL'],
    capabilities: ['HAS_PROFESSIONAL_PROFILE'],
    // Igual que /jobs en el sidebar (requiresAnyModule: ['employees']):
    // publicar vacantes es de quien tiene personal, no de cualquiera con
    // el módulo jobs (ej. un delivery independiente).
    requiresModule: 'employees',
    permissions: ['employees:view'],
    color: 'purple',
    description: 'Gestionar las vacantes que publicas',
  },
  {
    id: 'rides',
    name: 'Corridas y Fletes',
    icon: 'TruckIcon',
    route: '/rides',
    roles: ['PROFESIONAL'],
    capabilities: ['HAS_PROFESSIONAL_PROFILE'],
    requiresModule: 'corridas',
    color: 'teal',
    description: 'Corridas disponibles y tus asignaciones',
  },
  {
    id: 'manageMenu',
    name: 'Gestionar Menú',
    icon: 'DocumentTextIcon',
    route: '/menu',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    capabilities: ['HAS_COMMERCE'],
    requiresModule: 'menu',
    color: 'green',
    description: 'Administrar productos',
  },
  {
    id: 'inventory',
    name: 'Ver Inventario',
    icon: 'CubeIcon',
    route: '/inventory',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    capabilities: ['HAS_COMMERCE'],
    requiresModule: 'inventory',
    color: 'purple',
    description: 'Control de stock',
  },
  {
    id: 'analytics',
    name: 'Analytics',
    icon: 'ChartBarIcon',
    route: '/analytics',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    color: 'yellow',
    description: 'Reportes y estadísticas',
  },
  {
    id: 'expenses',
    name: 'Control Gastos',
    icon: 'CurrencyDollarIcon',
    route: '/expenses',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    // /expenses opera sobre un Commerce (Expense.commerceId) — mismo
    // HAS_COMMERCE que exige ModuleAccessGuard en el backend.
    capabilities: ['HAS_COMMERCE'],
    color: 'red',
    description: 'Gestión de gastos',
  },
  {
    id: 'delivery',
    name: 'Delivery',
    icon: 'TruckIcon',
    route: '/delivery',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    capabilities: ['HAS_COMMERCE'],
    requiresModule: 'delivery',
    color: 'teal',
    description: 'Gestión de entregas',
  },
  {
    id: 'users',
    name: 'Usuarios',
    icon: 'UsersIcon',
    route: '/users',
    roles: ['SUPERADMIN', 'ADMIN'],
    color: 'indigo',
    description: 'Gestión de usuarios',
  },
  {
    id: 'settings',
    name: 'Configuración',
    icon: 'CogIcon',
    route: '/settings',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL'],
    color: 'orange',
    description: 'Ajustes del sistema',
  },
  {
    id: 'myProfile',
    name: 'Mi Perfil',
    icon: 'UserIcon',
    route: '/profile',
    roles: ['SUPERADMIN', 'ADMIN', 'PROFESIONAL', 'NORMAL'],
    color: 'blue',
    description: 'Ver mi perfil',
  },
  {
    id: 'myOrders',
    name: 'Mis Pedidos',
    icon: 'ShoppingBagIcon',
    route: '/my-orders',
    roles: ['NORMAL'],
    color: 'green',
    description: 'Ver mis pedidos',
  },
  {
    id: 'serviceRequests',
    name: 'Solicitudes',
    icon: 'ClipboardDocumentListIcon',
    route: '/service-requests',
    roles: ['NORMAL'],
    color: 'purple',
    description: 'Mis solicitudes de servicio',
  },
  {
    id: 'browseServices',
    name: 'Servicios',
    icon: 'WrenchIcon',
    route: '/search?tab=servicios',
    roles: ['NORMAL'],
    color: 'orange',
    description: 'Explorar servicios',
  },
  {
    id: 'searchProducts',
    name: 'Buscar',
    icon: 'MagnifyingGlassIcon',
    route: '/search',
    roles: ['NORMAL'],
    color: 'teal',
    description: 'Buscar productos',
  },
]

// CONFIGURACIÓN DE HERO POR ROL
export const HERO_CONFIGS: HeroConfig[] = [
  {
    roles: ['SUPERADMIN'],
    title: 'Panel de Control Global',
    subtitle: 'Administración completa del sistema WorkPlace Manager',
    icon: 'ShieldCheckIcon',
    gradient: 'from-purple-600 via-purple-500 to-indigo-600',
  },
  {
    roles: ['ADMIN'],
    title: 'Dashboard Administrativo',
    // Un ADMIN no tiene un Commerce propio (ver PlatformAnalyticsStrategy,
    // BusinessHealthService.getPlatformSummary, etc.) — el texto anterior
    // ("tu comercio") era incorrecto para este rol.
    subtitle: 'Gestión y supervisión de toda la plataforma',
    icon: 'BuildingOfficeIcon',
    gradient: 'from-workplace-red via-red-500 to-red-600',
  },
  {
    // Comercio real: perfil BUSINESS aprobado, no solo "tiene un Commerce
    // técnico". Va ANTES de la variante de abajo a propósito (find() toma el
    // primer match) — un usuario BUSINESS + PROFESSIONAL ve este primero.
    roles: ['PROFESIONAL'],
    capabilities: ['HAS_COMMERCE', 'HAS_BUSINESS_PROFILE'],
    title: 'Panel de Comercio',
    subtitle: 'Bienvenido a tu panel de control WorkPlace Manager',
    icon: 'BuildingStorefrontIcon',
    gradient: 'from-workplace-red via-red-500 to-red-600',
  },
  {
    // "Opción 2": un PROFESSIONAL cuya categoría vende producto físico (ej.
    // Comida) tiene un Commerce creado automáticamente para que menu/orders
    // funcionen, pero sigue siendo autónomo — nunca aprobó un perfil BUSINESS.
    // "Panel de Comercio" ahí sería confuso ("¿soy una empresa?"), así que usa
    // el mismo copy neutral de "Panel de Proveedor" en vez de uno nuevo.
    roles: ['PROFESIONAL'],
    capabilities: ['HAS_COMMERCE', 'HAS_PROFESSIONAL_PROFILE'],
    title: 'Panel de Proveedor',
    subtitle: 'Gestión de tus productos, servicios y solicitudes de clientes',
    icon: 'WrenchIcon',
    gradient: 'from-teal-500 via-teal-600 to-emerald-600',
  },
  {
    roles: ['PROFESIONAL'],
    capabilities: ['HAS_PROFESSIONAL_PROFILE'],
    title: 'Panel de Proveedor',
    subtitle: 'Gestión de tus servicios y solicitudes de clientes',
    icon: 'WrenchIcon',
    gradient: 'from-teal-500 via-teal-600 to-emerald-600',
  },
  {
    roles: ['NORMAL'],
    title: 'Mi Dashboard',
    subtitle: 'Bienvenido a tu espacio personal',
    icon: 'UserIcon',
    gradient: 'from-blue-500 via-blue-600 to-indigo-600',
  },
]

// Las capacidades solo se exigen si la config las define (widgets/acciones/
// hero sin `capabilities` son visibles para cualquiera de sus roles).
function matchesCapabilities(required: Capability[] | undefined, has: HasCapability): boolean {
  if (!required || required.length === 0) return true
  return required.every(has)
}

// Helper para obtener hero según rol. Orden de HERO_CONFIGS: un profesional
// que también tiene Commerce ("opción 2") ve el panel de comercio primero.
export function getHeroConfig(role: UserRole, has: HasCapability = () => false): HeroConfig {
  return (
    HERO_CONFIGS.find(config => config.roles.includes(role) && matchesCapabilities(config.capabilities, has)) ||
    HERO_CONFIGS[HERO_CONFIGS.length - 1]
  )
}

// Widgets con capabilities: ['HAS_COMMERCE'] cuyo backend también resuelve
// datos agregados de TODA la plataforma para SUPERADMIN/ADMIN (ver
// /orders/platform-stats, /orders/platform-recent y useDashboard.ts) — un
// admin no tiene Commerce propio, así que sin esta excepción
// matchesCapabilities() los ocultaría siempre, aunque sí tengan datos reales
// que mostrarle. lowStock queda afuera a propósito: es puramente
// por-comercio, sin agregado de plataforma con sentido de negocio.
const PLATFORM_AGGREGATED_WIDGET_IDS = new Set(['activeOrders', 'ordersList'])

// Helper para verificar si un rol tiene acceso a un widget. `hasModule` es
// opcional: los llamadores que todavía no cargaron useModules() (o no
// necesitan ese nivel de precisión) pueden omitirlo, y requiresModule se
// ignora — mejor mostrar de más brevemente que romper un caller existente.
export function canAccessWidget(
  widgetId: string,
  role: UserRole,
  has: HasCapability,
  hasModule?: (module: string) => boolean,
): boolean {
  const widget = DASHBOARD_WIDGETS.find(w => w.id === widgetId)
  if (!widget) return false
  if (!widget.roles.includes(role)) return false
  if (widget.requiresModule && hasModule && !hasModule(widget.requiresModule)) return false
  if ((role === 'SUPERADMIN' || role === 'ADMIN') && PLATFORM_AGGREGATED_WIDGET_IDS.has(widgetId)) return true
  if (role === 'SUPERADMIN' || role === 'ADMIN') return !widget.capabilities?.length
  return matchesCapabilities(widget.capabilities, has)
}

// Helper para verificar si un rol tiene acceso a una acción
export function canAccessAction(
  actionId: string,
  role: UserRole,
  has: HasCapability,
  hasModule?: (module: string) => boolean,
  can?: (permission: string) => boolean,
): boolean {
  const action = QUICK_ACTIONS.find(a => a.id === actionId)
  if (!action) return false
  if (!action.roles.includes(role)) return false
  if (action.requiresModule && hasModule && !hasModule(action.requiresModule)) return false
  // effectiveModules es plan ∩ categoría y no filtra por papel: el permiso
  // completa la regla cuando el módulo solo no alcanza (ver manageJobs).
  if (action.permissions?.length && can && !action.permissions.every(can)) return false
  if (role === 'SUPERADMIN' || role === 'ADMIN') return !action.capabilities?.length
  return matchesCapabilities(action.capabilities, has)
}
