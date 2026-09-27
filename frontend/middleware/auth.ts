import { navigateTo, defineNuxtRouteMiddleware } from 'nuxt/app'
import { useAuth } from '~/composables/auth/useAuth'
import { usePermissions } from '~/composables/users/usePermissions'
import { useNavigation } from '~/composables/core/useNavigation'
import { isPublicRoute } from '~/utils/publicRoutes'

type Role = 'SUPERADMIN' | 'ADMIN' | 'PROFESIONAL' | 'NORMAL'

// ─── Grupos de roles ──────────────────────────────────────────────────────────
// COMMERCE/FREELANCER se fusionaron en PROFESIONAL (backend, 2026-08-25) —
// ninguno de estos grupos necesitaba distinguir cuál de los dos era, solo
// "tiene algún perfil de negocio activo".
const ADMIN_ROLES:              Role[] = ['SUPERADMIN', 'ADMIN']
const ALL_EXCEPT_NORMAL:        Role[] = ['SUPERADMIN', 'ADMIN', 'PROFESIONAL']

// ─── Rutas que solo pueden ver usuarios NO autenticados ───────────────────────
// (autenticado → redirige al dashboard)
const GUEST_ONLY_ROUTES: string[] = [
  '/login', '/register', '/recover-password', '/reset-password', '/auth/google/callback', '/auth/2fa-verify',
]

// El mapa ruta→permiso requerido ahora viene de GET /navigation (backend),
// vía useNavigation().routePermissions — fuente única compartida con
// SidebarContent.vue y middleware/modules.global.ts. Si el usuario NO tiene
// el permiso → se le redirige según su rol (ver bloque 4e más abajo).
//
// GET /navigation requiere sesión, así que para decidir si una ruta
// necesita login (bloque 4, usuario SIN autenticar) no podemos depender de
// esa respuesta — se mantiene esta lista estática de paths conocidos
// (sin el permiso asociado, solo "esta ruta existe y está protegida").
const KNOWN_PROTECTED_ROUTES: string[] = [
  '/users', '/categories', '/permissions', '/audit-log', '/logs', '/plans', '/exchange-rates',
  '/menu', '/inventory', '/my-services', '/jobs', '/customer-dashboard',
  '/employees', '/branches', '/cash-register',
  '/expenses', '/sales', '/analytics', '/reports', '/appointments', '/customers', '/delivery', '/orders',
  '/service-requests', '/wallet',
  '/commissions', '/search-tabs', '/locations',
]

// ─── Rutas restringidas a SUPERADMIN/ADMIN sin permission matrix propia ───────
// (el backend las protege con @Roles(SUPERADMIN, ADMIN) fijo, no con
// PermissionsGuard, así que aquí se replica el mismo criterio en vez de
// inventar un permiso que no existe)
const ADMIN_ONLY_ROUTES: string[] = [
  '/kyc-admin', '/landing-admin', '/proposed-categories-admin', '/service-requests-admin',
  '/wallet-deposit-requests-admin', '/reports-admin',
  '/wallets-admin', '/service-categories-admin', '/profile-activations-admin',
]

// Rutas que no necesitan permiso específico pero sí autenticación
const NEEDS_AUTH_ONLY: string[] = [
  '/dashboard', '/profile', '/settings', '/my-plan', '/onboarding', '/search',
  '/report-issue', '/verification', '/modules', '/my-orders', '/rides',
]

// ─── Rutas exclusivas de comercios (Order/Customer/Employee/etc. por-comercio) ─
// Un FREELANCER no debería poder entrar aunque escriba la URL a mano. El
// sidebar ya oculta el link (excludeAccountTypes: ['FREELANCER'] en
// navigation-tree.data.ts), pero eso solo esconde el ítem — no bloquea la
// ruta. El permiso de rol tampoco alcanza para bloquearla acá (bloque 4e):
// Role.PROFESIONAL concede estos permisos a nivel de ROL como la unión
// comercio∪freelancer (ver ROLE_DEFAULTS.PROFESIONAL en seed.js), así que
// `can(requiredPerm)` da true para cualquier PROFESIONAL sea cual sea su
// accountType real. Sin esta lista, la página igual renderiza (vacía, con
// el 403 de AccountTypeGuard en un banner) en vez de redirigir.
const COMMERCE_ONLY_ROUTES: string[] = [
  '/customer-dashboard', '/expenses', '/orders', '/appointments', '/customers',
  '/delivery', '/cash-register', '/suppliers', '/purchases', '/accounts',
  '/employees', '/branches', '/group-buying',
]

// ─── Excluidas del chequeo de onboarding ─────────────────────────────────────
const ONBOARDING_EXCLUDED: string[] = [
  '/onboarding', '/login', '/register', '/recover-password',
  '/verify-email', '/pricing',
]

// ─── Helper: destino de redirección por defecto según rol ─────────────────────
function defaultDest(_role?: Role): string {
  return '/dashboard'
}

export default defineNuxtRouteMiddleware(async (to: any) => {
  if (process.server) return

  const auth = useAuth()
  const { isAuthenticated, user } = auth
  const { can, initialized } = usePermissions()
  const { routePermissions, loadNavigation } = useNavigation()

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
      KNOWN_PROTECTED_ROUTES.some(r => path.startsWith(r)) ||
      ADMIN_ONLY_ROUTES.some(r => path.startsWith(r)) ||
      NEEDS_AUTH_ONLY.some(r => path.startsWith(r))
    if (needsAuth) return navigateTo(`/login?redirect=${encodeURIComponent(path)}`)
    return
  }

  // ── 5. Usuario autenticado ────────────────────────────────────────────────
  if (!user.value) return

  // Cargar el árbol de navegación (fuente de routePermissions) una vez por
  // sesión — no-op si ya está cargado (singleton compartido con el sidebar).
  await loadNavigation()

  // ── 4b. Onboarding: PROFESIONAL sin categoría ────────────────────────────
  // Clave namespaced por userId (misma convención que pages/onboarding.vue)
  // — sin esto, en un dispositivo compartido el "completado" de un usuario
  // se filtraba a la sesión del siguiente que iniciara sesión ahí.
  const onboardingDone = process.client
    ? localStorage.getItem(`onboarding_completed_${user.value.id}`) === 'true'
    : false

  if (
    role === 'PROFESIONAL' &&
    !user.value.categoryId &&
    !onboardingDone &&
    !ONBOARDING_EXCLUDED.some(p => path.startsWith(p))
  ) {
    return navigateTo('/onboarding')
  }

  // ── 4b-2. /my-plan: SUPERADMIN/ADMIN no adquieren planes propios ──────────
  if (path.startsWith('/my-plan') && ADMIN_ROLES.includes(role)) {
    return navigateTo('/plans')
  }

  // ── 4c. /menu requiere el permiso "menu:view" ─────────────────────────────
  // El gating por categoría/módulo ("¿esta categoría tiene el módulo menu?")
  // ya lo hace middleware/modules.global.ts vía routeModules/effectiveModules
  // (categoría→allowedModules es admin-gerenciable, ya no un nombre fijo aquí).
  if (path.startsWith('/menu') && initialized.value) {
    if (!can('menu:view')) {
      // Si tiene acceso a servicios → redirigir ahí; si no, al default
      return navigateTo(can('services:view') ? '/my-services' : defaultDest(role))
    }
  }

  // ── 4c-2. /orders es exclusivo de comercios → NORMAL usa /my-orders ───
  if (path.startsWith('/orders') && role === 'NORMAL') {
    return navigateTo('/my-orders')
  }

  // ── 4c-3. Rutas exclusivas de comercios → bloquear a FREELANCER ──────────
  // Ver comentario en COMMERCE_ONLY_ROUTES para el porqué: el chequeo
  // genérico de permiso de 4e no alcanza a bloquear esto.
  if (COMMERCE_ONLY_ROUTES.some(r => path.startsWith(r)) && user.value.accountType === 'FREELANCER') {
    return navigateTo(defaultDest(role))
  }

  // ── 4d. Rutas SUPERADMIN/ADMIN sin permission matrix propia ───────────────
  if (ADMIN_ONLY_ROUTES.some(r => path.startsWith(r)) && !ADMIN_ROLES.includes(role)) {
    return navigateTo(defaultDest(role))
  }

  // ── 4e. Verificar permiso por ruta (usando routePermissions de /navigation) ─
  // Solo verificar si los permisos ya están inicializados (evitar falsos negativos)
  if (initialized.value) {
    const matchedRoute = Object.keys(routePermissions.value).find(r => path.startsWith(r))
    if (matchedRoute) {
      const requiredPerm = routePermissions.value[matchedRoute]
      if (requiredPerm && !can(requiredPerm)) {
        // SUPERADMIN y ADMIN bypasean permisos de módulo
        if (!ADMIN_ROLES.includes(role)) {
          return navigateTo(defaultDest(role))
        }
      }
    }
  }
})
