import { navigateTo, defineNuxtRouteMiddleware } from 'nuxt/app'
import { useAuth } from '~/composables/auth/useAuth'
import { usePermissions } from '~/composables/users/usePermissions'
import { useNavigation } from '~/composables/core/useNavigation'
import { useProfileContext } from '~/composables/users/useProfileContext'
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

// Los mapas ruta→permiso / ruta→módulo / ruta→capacidad vienen de GET
// /navigation (backend), vía useNavigation() — fuente única compartida con
// SidebarContent.vue y middleware/modules.global.ts. El backend evalúa ahí
// las mismas capas que sus guards; este middleware solo redirige.

// ─── Rutas restringidas a SUPERADMIN/ADMIN sin permission matrix propia ───────
// (el backend las protege con @Roles(SUPERADMIN, ADMIN) fijo, no con
// PermissionsGuard, así que aquí se replica el mismo criterio en vez de
// inventar un permiso que no existe)
const ADMIN_ONLY_ROUTES: string[] = [
  '/kyc-admin', '/landing-admin', '/proposed-categories-admin', '/service-requests-admin',
  '/wallet-deposit-requests-admin', '/reports-admin',
  '/wallets-admin', '/service-categories-admin', '/profile-activations-admin',
  '/billing-admin', '/disputes-admin', '/ride-drivers-admin', '/platform-settings',
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
  const { routePermissions, routeCapabilities, loadNavigation } = useNavigation()
  const { hasCapability } = useProfileContext()

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
  // Este middleware solo corre en páginas que lo declaran
  // (definePageMeta({ middleware: 'auth' })) y las públicas ya salieron en
  // el bloque 1: cualquier otra ruta que llega acá exige sesión. Fail-closed
  // por construcción — antes dependía de que cada ruta nueva se agregara a
  // una lista estática (KNOWN_PROTECTED_ROUTES), que ya estaba desactualizada.
  if (!authed) {
    return navigateTo(`/login?redirect=${encodeURIComponent(path)}`)
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

  // ── 4c-3. Rutas que operan sobre un Commerce → exigir HAS_COMMERCE ───────
  // Mismo requisito que el backend (ModuleAccessGuard/CapabilityGuard),
  // servido por /navigation (routeCapabilities). Un profesional que vende
  // producto SÍ tiene Commerce ("opción 2"); uno de servicios no. Admins
  // quedan fuera por 4d/4e y por excludeRoles en el árbol del backend.
  const requiredCapability = Object.entries(routeCapabilities.value).find(([r]) => path.startsWith(r))?.[1]
  if (requiredCapability && !ADMIN_ROLES.includes(role) && !hasCapability(requiredCapability)) {
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
