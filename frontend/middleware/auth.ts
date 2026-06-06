import { navigateTo, defineNuxtRouteMiddleware } from 'nuxt/app'
import { useAuth } from '~/composables/useAuth'
import { usePermissions } from '~/composables/usePermissions'

type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

// ─── Grupos de roles ──────────────────────────────────────────────────────────
const ADMIN_ROLES:              Role[] = ['SUPERADMIN', 'ADMIN']
const COMMERCE_ROLES:           Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE']
const FREELANCER_COMMERCE:      Role[] = ['COMMERCE', 'FREELANCER']
const ALL_EXCEPT_NORMAL:        Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER']
const SERVICE_REQUEST_ROLES:    Role[] = ['COMMERCE', 'FREELANCER', 'NORMAL']

// ─── Rutas públicas (no requieren sesión) ─────────────────────────────────────
const PUBLIC_ROUTES: string[] = [
  '/', '/precios', '/login', '/register',
  '/recover-password', '/reset-password',
  '/verify-email', '/auth/google/callback',
  '/privacidad', '/terminos', '/soporte',
]

// ─── Rutas que solo pueden ver usuarios NO autenticados ───────────────────────
// (autenticado → redirige al dashboard)
const GUEST_ONLY_ROUTES: string[] = [
  '/login', '/register', '/recover-password', '/reset-password', '/auth/google/callback',
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
}

// Rutas que no necesitan permiso específico pero sí autenticación
const NEEDS_AUTH_ONLY: string[] = ['/dashboard', '/perfil', '/configuracion', '/mi-plan', '/onboarding', '/search']

// ─── Excluidas del chequeo de onboarding ─────────────────────────────────────
const ONBOARDING_EXCLUDED: string[] = [
  '/onboarding', '/login', '/register', '/recover-password',
  '/verify-email', '/precios',
]

// ─── Helper: destino de redirección por defecto según rol ─────────────────────
function defaultDest(_role?: Role): string {
  return '/dashboard'
}

export default defineNuxtRouteMiddleware((to: any) => {
  if (process.server) return

  const { isAuthenticated, user } = useAuth()
  const { can, userCategory, initialized } = usePermissions()

  const path  = to.path as string
  const role  = (user.value?.role ?? 'NORMAL') as Role
  const authed = isAuthenticated.value

  // ── 1. Rutas completamente públicas → siempre permitir ────────────────────
  if (PUBLIC_ROUTES.some(r => path === r || path.startsWith('/p/'))) return

  // ── 2. Rutas solo para invitados (no autenticado) ─────────────────────────
  if (GUEST_ONLY_ROUTES.includes(path)) {
    if (authed) {
      // /verify-email: permite acceso aunque estés autenticado
      if (path === '/verify-email') return
      return navigateTo(defaultDest(role))
    }
    return
  }

  // ── 3. No autenticado → login ─────────────────────────────────────────────
  if (!authed) {
    // Si la ruta está en el mapa de permisos o en auth routes, requiere sesión
    const needsAuth =
      Object.keys(PERMISSION_ROUTE_MAP).some(r => path.startsWith(r)) ||
      NEEDS_AUTH_ONLY.some(r => path.startsWith(r))
    if (needsAuth) return navigateTo(`/login?redirect=${encodeURIComponent(path)}`)
    return
  }

  // ── 4. Usuario autenticado ────────────────────────────────────────────────
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

  // ── 4c. Restricción especial de /menu → solo categoría "Comida" ───────────
  if (path.startsWith('/menu') && initialized.value) {
    if (!can('menu:view') || userCategory.value !== 'Comida') {
      // Si tiene acceso a servicios → redirigir ahí; si no, al default
      return navigateTo(can('services:view') ? '/servicios' : defaultDest(role))
    }
  }

  // ── 4d. Verificar permiso por ruta (usando la tabla PERMISSION_ROUTE_MAP) ─
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
