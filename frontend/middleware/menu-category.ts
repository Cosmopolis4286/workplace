import { navigateTo, defineNuxtRouteMiddleware } from "nuxt/app"
import { useAuth } from "~/composables/useAuth"
import { usePermissions } from "~/composables/usePermissions"

export default defineNuxtRouteMiddleware((to: any) => {
  if (process.server) return

  const { isAuthenticated, user } = useAuth()
  const { userCategory } = usePermissions()

  // Only apply to menu routes
  if (!to.path.startsWith('/menu')) return

  // User must be authenticated
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }

  // User must have category "Comida" to access menu
  if (userCategory.value !== 'Comida') {
    // Redirect based on user role
    const role = user.value?.role
    
    if (role === 'NORMAL') {
      return navigateTo('/search')
    } else if (role === 'SUPERADMIN' || role === 'ADMIN') {
      return navigateTo('/dashboard')
    } else {
      // COMMERCE or FREELANCER without Comida category
      return navigateTo('/servicios')
    }
  }
})
