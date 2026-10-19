/**
 * modules middleware
 * Protege rutas según los módulos efectivos del usuario (plan ∩ categoría).
 * Solo aplica a PROFESIONAL — ADMIN/SUPERADMIN/NORMAL pasan siempre.
 */

import { navigateTo, defineNuxtRouteMiddleware } from "nuxt/app"
import { useAuth } from "~/composables/auth/useAuth"
import { useModules } from "~/composables/commerce/useModules"
import { useNavigation } from "~/composables/core/useNavigation"
import { usePermissions } from "~/composables/users/usePermissions"

// El mapa ruta→módulo requerido ahora viene de GET /navigation (backend),
// vía useNavigation().routeModules — misma fuente que middleware/auth.ts y
// SidebarContent.vue, ya no hace falta mantenerlo sincronizado a mano.

const UNRESTRICTED_ROLES = ['SUPERADMIN', 'ADMIN', 'NORMAL']

export default defineNuxtRouteMiddleware(async (to: any) => {
  if (process.server) return

  const auth = useAuth()
  const { isAuthenticated, user } = auth
  if (!isAuthenticated.value) return
  await auth.ensureSessionVerified()
  if (!isAuthenticated.value || !user.value) return

  const role = user.value.role
  if (UNRESTRICTED_ROLES.includes(role)) return

  const { routeModules, routeAnyModules, loadNavigation } = useNavigation()
  await loadNavigation()

  const matchRoute = <T>(map: Record<string, T>): T | undefined =>
    Object.entries(map).find(([route]) => to.path.startsWith(route))?.[1]

  const requiredModule = matchRoute(routeModules.value)
  const anyModules = matchRoute(routeAnyModules.value)
  if (!requiredModule && !anyModules) return

  // Load effective modules (cached after first call)
  const { hasModule, loadModules } = useModules()
  await loadModules()

  if (requiredModule && !hasModule(requiredModule)) {
    return navigateTo('/dashboard')
  }
  // Misma regla que NavigationService (requiresAnyModule): el módulo cuenta
  // solo si además el papel puede verlo.
  // Si los permisos todavía no cargaron se evalúa solo el módulo (mismo
  // criterio que middleware/auth.ts con `initialized`): mejor dejar pasar un
  // instante que expulsar a quien sí tiene acceso.
  if (anyModules) {
    const { can, initialized } = usePermissions()
    const canView = (m: string) => !initialized.value || can(`${m}:view`)
    if (!anyModules.some((m) => hasModule(m) && canView(m))) {
      return navigateTo('/dashboard')
    }
  }
})
