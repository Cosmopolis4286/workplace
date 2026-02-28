type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

// Routes only accessible to SUPERADMIN or ADMIN
const adminOnlyRoutes: string[] = ['/usuarios']

// Routes only accessible by COMMERCE and above (not FREELANCER/NORMAL)
const commerceRoutes: string[] = [
  '/menu', '/inventario', '/gastos', '/ventas', '/analytics', '/reportes',
  '/agendamientos', '/clientes', '/delivery', '/pedidos', '/empleados', '/sucursales',
]

// Routes for NORMAL/FREELANCER users (marketplace)
const normalRoutes: string[] = ['/inicio']

const protectedRoutes: string[] = [
  '/dashboard', '/cliente-dashboard', '/perfil', '/configuracion',
  ...adminOnlyRoutes,
  ...commerceRoutes,
  ...normalRoutes,
]

const authRoutes: string[] = ['/login', '/register', '/recover-password', '/verify-email', '/auth/google/callback']

const COMMERCE_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE']
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
    return navigateTo(NORMAL_ROLES.includes(role) ? '/inicio' : '/dashboard')
  }

  if (isAuthenticated.value && user.value) {
    const role = user.value.role as Role

    if (adminOnlyRoutes.some(r => to.path.startsWith(r)) && !ADMIN_ROLES.includes(role)) {
      return navigateTo(NORMAL_ROLES.includes(role) ? '/inicio' : '/dashboard')
    }

    if (commerceRoutes.some(r => to.path.startsWith(r)) && !COMMERCE_ROLES.includes(role)) {
      return navigateTo('/inicio')
    }

    // COMMERCE/ADMIN/SUPERADMIN don't need /inicio — redirect to dashboard
    if (normalRoutes.some(r => to.path.startsWith(r)) && !NORMAL_ROLES.includes(role)) {
      return navigateTo('/dashboard')
    }

    // Redirect NORMAL/FREELANCER away from /dashboard to /inicio
    if (to.path.startsWith('/dashboard') && NORMAL_ROLES.includes(role)) {
      return navigateTo('/inicio')
    }
  }
})
