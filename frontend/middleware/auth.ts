import { navigateTo, defineNuxtRouteMiddleware } from "nuxt/app"
import { useAuth } from "~/composables/useAuth"
import { usePermissions } from "~/composables/usePermissions"

type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

// Routes only accessible to SUPERADMIN or ADMIN
const adminOnlyRoutes: string[] = ['/usuarios', '/categorias', '/permisos', '/auditoria', '/logs', '/planes', '/tasas-cambio']

// Routes only for COMMERCE and FREELANCER (NOT SuperAdmin/Admin) - menu, inventory, services, orders dashboard
const commerceOnlyRoutes: string[] = ['/menu', '/inventario', '/servicios', '/cliente-dashboard']

// Routes accessible by COMMERCE, ADMIN, SUPERADMIN AND FREELANCER (all except Normal)
const commerceRoutes: string[] = [
  '/gastos', '/ventas', '/analytics', '/reportes',
  '/agendamientos', '/clientes', '/delivery', '/pedidos',
]

// Routes available to NORMAL, FREELANCER, and COMMERCE (service requests and corridas)
// Backend: NORMAL has service_requests:view and corridas:create
const serviceRequestRoutes: string[] = ['/solicitudes-servicio', '/corridas']

// Routes only for COMMERCE and above (not FREELANCER)
const empresaRoutes: string[] = ['/empleados', '/sucursales']

// Routes for NORMAL/FREELANCER/COMMERCE users (marketplace/search)
const searchRoutes: string[] = ['/search']

const protectedRoutes: string[] = [
  '/dashboard', '/perfil', '/configuracion', '/mi-plan',
  ...adminOnlyRoutes,
  ...commerceOnlyRoutes,
  ...commerceRoutes,
  ...empresaRoutes,
  ...serviceRequestRoutes,
  ...searchRoutes,
]

const authRoutes: string[] = ['/login', '/register', '/recover-password', '/verify-email', '/auth/google/callback']
const onboardingExcluded: string[] = ['/onboarding', '/login', '/register', '/recover-password', '/verify-email', '/precios']

const COMMERCE_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE']
const FREELANCER_COMMERCE_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER']
const ADMIN_ROLES: Role[] = ['SUPERADMIN', 'ADMIN']
const NORMAL_ROLES: Role[] = ['NORMAL', 'FREELANCER']
// Roles that can access commerce-only routes (menu, inventory, services) - NOT SuperAdmin/Admin
const COMMERCE_FREELANCER_ONLY: Role[] = ['COMMERCE', 'FREELANCER']
// Roles that can access service requests (includes NORMAL)
const SERVICE_REQUEST_ROLES: Role[] = ['COMMERCE', 'FREELANCER', 'NORMAL']

export default defineNuxtRouteMiddleware((to: any) => {
  if (process.server) return

  const { isAuthenticated, user } = useAuth()
  const { userCategory } = usePermissions()

  if (protectedRoutes.some(r => to.path.startsWith(r)) && !isAuthenticated.value) {
    return navigateTo('/login')
  }

  if (authRoutes.includes(to.path) && isAuthenticated.value) {
    const role = user.value?.role as Role
    return navigateTo(role === 'NORMAL' ? '/search' : '/dashboard')
  }

  if (isAuthenticated.value && user.value) {
    const role = user.value.role as Role

    if (adminOnlyRoutes.some(r => to.path.startsWith(r)) && !ADMIN_ROLES.includes(role)) {
      return navigateTo(NORMAL_ROLES.includes(role) ? '/search' : '/dashboard')
    }

    // Routes only for COMMERCE and FREELANCER (NOT SuperAdmin/Admin) - menu, inventory, services
    if (commerceOnlyRoutes.some(r => to.path.startsWith(r)) && !COMMERCE_FREELANCER_ONLY.includes(role)) {
      return navigateTo(role === 'NORMAL' ? '/search' : '/dashboard')
    }

    // Special restriction for menu: only users with category "Comida" can access it
    if (to.path.startsWith('/menu') && userCategory.value !== 'Comida') {
      if (role === 'NORMAL') {
        return navigateTo('/search')
      } else if (ADMIN_ROLES.includes(role)) {
        return navigateTo('/dashboard')
      } else {
        // COMMERCE or FREELANCER without Comida category
        return navigateTo('/servicios')
      }
    }

    // Service requests available to COMMERCE, FREELANCER, and NORMAL
    if (serviceRequestRoutes.some(r => to.path.startsWith(r)) && !SERVICE_REQUEST_ROLES.includes(role)) {
      return navigateTo(ADMIN_ROLES.includes(role) ? '/dashboard' : '/search')
    }

    if (commerceRoutes.some(r => to.path.startsWith(r)) && !FREELANCER_COMMERCE_ROLES.includes(role)) {
      return navigateTo('/search')
    }

    if (empresaRoutes.some(r => to.path.startsWith(r)) && !COMMERCE_ROLES.includes(role)) {
      return navigateTo('/dashboard')
    }

    // Redirect NORMAL away from /dashboard to /search
    if (to.path.startsWith('/dashboard') && role === 'NORMAL') {
      return navigateTo('/search')
    }

    // Redirect COMMERCE/FREELANCER without category to onboarding
    // But check if onboarding was completed first
    const onboardingCompleted = process.client ? localStorage.getItem('onboarding_completed') : null
    if (
      (role === 'COMMERCE' || role === 'FREELANCER') &&
      !user.value.categoryId &&
      !onboardingExcluded.some(p => to.path.startsWith(p)) &&
      onboardingCompleted !== 'true'
    ) {
      return navigateTo('/onboarding')
    }
  }
})
