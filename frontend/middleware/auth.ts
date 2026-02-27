type Role = 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'

// Routes only accessible to SUPERADMIN or ADMIN
const adminOnlyRoutes: string[] = ['/usuarios']

// Routes only accessible by COMMERCE and above (not FREELANCER/NORMAL)
const commerceRoutes: string[] = [
  '/menu', '/inventario', '/gastos', '/ventas', '/analytics', '/reportes',
  '/agendamientos', '/clientes', '/delivery', '/pedidos', '/empleados', '/sucursales',
]

const protectedRoutes: string[] = [
  '/dashboard', '/cliente-dashboard', '/perfil', '/configuracion',
  ...adminOnlyRoutes,
  ...commerceRoutes,
]

const authRoutes: string[] = ['/login', '/register', '/recover-password', '/verify-email']

const COMMERCE_ROLES: Role[] = ['SUPERADMIN', 'ADMIN', 'COMMERCE']
const ADMIN_ROLES: Role[] = ['SUPERADMIN', 'ADMIN']

export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return

  const { isAuthenticated, user } = useAuth()

  if (protectedRoutes.some(r => to.path.startsWith(r)) && !isAuthenticated.value) {
    return navigateTo('/login')
  }

  if (authRoutes.includes(to.path) && isAuthenticated.value) {
    return navigateTo('/dashboard')
  }

  if (isAuthenticated.value && user.value) {
    const role = user.value.role as Role

    if (adminOnlyRoutes.some(r => to.path.startsWith(r)) && !ADMIN_ROLES.includes(role)) {
      return navigateTo('/dashboard')
    }

    if (commerceRoutes.some(r => to.path.startsWith(r)) && !COMMERCE_ROLES.includes(role)) {
      return navigateTo('/dashboard')
    }
  }
})
