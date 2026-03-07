type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

// Routes only accessible to SUPERADMIN or ADMIN
const adminOnlyRoutes: string[] = ['/usuarios', '/permisos', '/auditoria', '/logs']

// Routes accessible by COMMERCE, ADMIN, SUPERADMIN AND FREELANCER (all except empresa)
const commerceRoutes: string[] = [
  '/menu', '/inventario', '/gastos', '/ventas', '/analytics', '/reportes',
  '/agendamientos', '/clientes', '/delivery', '/pedidos', '/cliente-dashboard',
]

// Routes only for COMMERCE and above (not FREELANCER)
const empresaRoutes: string[] = ['/empleados', '/sucursales']

// Routes for NORMAL/FREELANCER/COMMERCE users (marketplace/search)
const searchRoutes: string[] = ['/search']

const protectedRoutes: string[] = [
  '/dashboard', '/perfil', '/configuracion',
  ...adminOnlyRoutes,
  ...commerceRoutes,
  ...empresaRoutes,
  ...searchRoutes,
]

const authRoutes: string[] = ['/login', '/register', '/recover-password', '/verify-email', '/auth/google/callback']

const COMMERCE_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE']
const FREELANCER_COMMERCE_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE', 'FREELANCER']
const ADMIN_ROLES: Role[] = ['SUPERADMIN', 'ADMIN']
const NORMAL_ROLES: Role[] = ['NORMAL', 'FREELANCER']

export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return

  const { isAuthenticated, user } = useAuth()

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
  }
})
