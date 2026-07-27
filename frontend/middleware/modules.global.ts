/**
 * modules middleware
 * Protege rutas según los módulos efectivos del usuario (plan ∩ categoría).
 * Solo aplica a COMMERCE y FREELANCER — ADMIN/SUPERADMIN/NORMAL pasan siempre.
 */

import { navigateTo, defineNuxtRouteMiddleware } from "nuxt/app"
import { useAuth } from "~/composables/useAuth"
import { useModules } from "~/composables/useModules"
import { useNavigation } from "~/composables/useNavigation"

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

  const { routeModules, loadNavigation } = useNavigation()
  await loadNavigation()

  // Find required module for this route
  const requiredModule = Object.entries(routeModules.value).find(([route]) =>
    to.path.startsWith(route)
  )?.[1]

  if (!requiredModule) return

  // Load effective modules (cached after first call)
  const { hasModule, loadModules } = useModules()
  await loadModules()

  if (!hasModule(requiredModule)) {
    return navigateTo('/dashboard')
  }
})
