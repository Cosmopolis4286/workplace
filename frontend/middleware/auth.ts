import { navigateTo, defineNuxtRouteMiddleware } from 'nuxt/app'
import { useAuth } from '~/composables/useAuth'
import { usePermissions } from '~/composables/usePermissions'
import { isPublicRoute } from '~/utils/publicRoutes'

type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

// ─── Grupos de roles ──────────────────────────────────────────────────────────
const ADMIN_ROLES:              Role[] = ['SUPERADMIN', 'ADMIN']
const COMMERCE_ROLES:           Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE']
const FREELANCER_COMMERCE:      Role[] = ['COMMERCE', 'FREELANCER']
const ALL_EXCEPT_NORMAL:        Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER']
const SERVICE_REQUEST_ROLES:    Role[] = ['COMMERCE', 'FREELANCER', 'NORMAL']

// ─── Rutas que solo pueden ver usuarios NO autenticados ───────────────────────
// (autenticado → redirige al dashboard)
const GUEST_ONLY_ROUTES: string[] = [
  '/login', '/register', '/recover-password', '/reset-password', '/auth/google/callback', '/auth/2fa-verify',
]

// ─── Rutas que requieren autenticación mínima (cualquier rol) ─────────────────
const AUTH_ROUTES: string[] = [
  '/dashboard', '/perfil', '/configuracion', '/onboarding',
  '/search', '/corridas', '/solicitudes-servicio', '/mi-plan',
]

// ─── Mapa ruta → permiso requerido (single source of truth con modules.global.ts) ───
// Si el usuario NO tiene el permiso → se le redirige según su rol
const PERMISSION_ROUTE_MAP: Record<string, string> = {
  // Admin-only
  '/usuarios':      'users:view',
  '/categorias':    'categories_global:view',
  '/permisos':      'permissions:manage',
  '/auditoria':     'audit:view',
  '/logs':          'logs:view',
  '/planes':        'plans:view',
  '/tasas-cambio':  'exchange_rates:view',

  // Commerce / Freelancer
  '/menu':          'menu:view',
  '/inventario':    'inventory:view',
  '/servicios':     'services:view',
  '/empleos':       'jobs:view',
  '/cliente-dashboard': 'orders:view',

  // Commerce-only (no Freelancer)
  '/empleados':     'employees:view',
  '/sucursales':    'branches:view',

  // Shared commerce routes
  '/gastos':        'expenses:view',
  '/ventas':        'sales:view',
  '/analytics':     'analytics:view',
  '/reportes':      'reports:view',
  '/agendamientos': 'appointments:view',
  '/clientes':      'customers:view',
  '/delivery':      'delivery:view',
  '/pedidos':       'orders:view',

  // Service / corridas
  '/solicitudes-servicio': 'service_requests:view',

  // Billetera
  '/billetera': 'wallets:use',

  // Comisiones de plataforma / tabs de búsqueda (permission matrix real)
  '/comisiones':   'platform_fees:view',
  '/search-tabs':  'search_tabs:view',
  '/localidades':  'locations:view',
}

// ─── Rutas restringidas a SUPERADMIN/ADMIN sin permission matrix propia ───────
// (el backend las protege con @Roles(SUPERADMIN, ADMIN) fijo, no con
// PermissionsGuard, así que aquí se replica el mismo criterio en vez de
// inventar un permiso que no existe)
const ADMIN_ONLY_ROUTES: string[] = [
  '/kyc-admin', '/landing-admin', '/categorias-propuestas-admin', '/solicitudes-servicio-admin',
]

// Rutas que no necesitan permiso específico pero sí autenticación
const NEEDS_AUTH_ONLY: string[] = [
  '/dashboard', '/perfil', '/configuracion', '/mi-plan', '/onboarding', '/search',
  '/reportar-problema', '/verificacion', '/modulos', '/mis-pedidos',
]

// ─── Excluidas del chequeo de onboarding ─────────────────────────────────────
const ONBOARDING_EXCLUDED: string[] = [
  '/onboarding', '/login', '/register', '/recover-password',
  '/verify-email', '/precios',
]

// ─── Helper: destino de redirección por defecto según rol ─────────────────────
function defaultDest(_role?: Role): string {
  return '/dashboard'
}

export default defineNuxtRouteMiddleware(async (to: any) => {
  if (process.server) return

  const auth = useAuth()
  const { isAuthenticated, user } = auth
  const { can, userCategory, initialized } = usePermissions()

  const path  = to.path as string

  // ── 1. Rutas completamente públicas → siempre permitir ────────────────────
  if (isPublicRoute(path)) return

  // ── 2. La sesión cacheada en localStorage no implica que el token siga
  // siendo válido en el servidor. Antes de decidir sobre cualquier ruta que
  // no sea pública, confirmamos la sesión una vez por carga de la app — si
  // el token expiró, esto la limpia (clearSession) antes de renderizar nada.
  await auth.ensureSessionVerified()

  const role  = (user.value?.role ?? 'NORMAL') as Role
  const authed = isAuthenticated.value

  // ── 3. Rutas solo para invitados (no autenticado) ─────────────────────────
  if (GUEST_ONLY_ROUTES.includes(path)) {
    if (authed) {
      // /verify-email: permite acceso aunque estés autenticado
      if (path === '/verify-email') return
      return navigateTo(defaultDest(role))
    }
    return
  }

  // ── 4. No autenticado → login ─────────────────────────────────────────────
  if (!authed) {
    // Cualquier ruta mapeada (por permiso, admin-only, o auth-only) requiere sesión.
    // Sin este chequeo, una ruta nueva que no se agregue a ninguna lista queda
    // accesible sin login por defecto — el "fail open" que causó este bug.
    const needsAuth =
      Object.keys(PERMISSION_ROUTE_MAP).some(r => path.startsWith(r)) ||
      ADMIN_ONLY_ROUTES.some(r => path.startsWith(r)) ||
      NEEDS_AUTH_ONLY.some(r => path.startsWith(r))
    if (needsAuth) return navigateTo(`/login?redirect=${encodeURIComponent(path)}`)
    return
  }

  // ── 5. Usuario autenticado ────────────────────────────────────────────────
  if (!user.value) return

  // ── 4b. Onboarding: COMMERCE/FREELANCER sin categoría ────────────────────
  const onboardingDone = process.client
    ? localStorage.getItem('onboarding_completed') === 'true'
    : false

  if (
    FREELANCER_COMMERCE.includes(role) &&
    !user.value.categoryId &&
    !onboardingDone &&
    !ONBOARDING_EXCLUDED.some(p => path.startsWith(p))
  ) {
    return navigateTo('/onboarding')
  }

  // ── 4b-2. /mi-plan: SUPERADMIN/ADMIN no adquieren planes propios ──────────
  if (path.startsWith('/mi-plan') && ADMIN_ROLES.includes(role)) {
    return navigateTo('/planes')
  }

  // ── 4c. Restricción especial de /menu → solo categoría "Comida" ───────────
  if (path.startsWith('/menu') && initialized.value) {
    if (!can('menu:view') || userCategory.value !== 'Comida') {
      // Si tiene acceso a servicios → redirigir ahí; si no, al default
      return navigateTo(can('services:view') ? '/servicios' : defaultDest(role))
    }
  }

  // ── 4c-2. /pedidos es exclusivo de comercios → NORMAL usa /mis-pedidos ───
  if (path.startsWith('/pedidos') && role === 'NORMAL') {
    return navigateTo('/mis-pedidos')
  }

  // ── 4d. Rutas SUPERADMIN/ADMIN sin permission matrix propia ───────────────
  if (ADMIN_ONLY_ROUTES.some(r => path.startsWith(r)) && !ADMIN_ROLES.includes(role)) {
    return navigateTo(defaultDest(role))
  }

  // ── 4e. Verificar permiso por ruta (usando la tabla PERMISSION_ROUTE_MAP) ─
  // Solo verificar si los permisos ya están inicializados (evitar falsos negativos)
  if (initialized.value) {
    const matchedRoute = Object.keys(PERMISSION_ROUTE_MAP).find(r => path.startsWith(r))
    if (matchedRoute) {
      const requiredPerm = PERMISSION_ROUTE_MAP[matchedRoute]
      if (!can(requiredPerm)) {
        // SUPERADMIN y ADMIN bypasean permisos de módulo
        if (!ADMIN_ROLES.includes(role)) {
          return navigateTo(defaultDest(role))
        }
      }
    }
  }
})
