export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return

  const { isAuthenticated } = useAuth()

  const protectedRoutes = [
    '/dashboard', '/menu', '/inventario', '/gastos', '/ventas',
    '/analytics', '/reportes', '/agendamientos', '/clientes', '/delivery',
    '/pedidos', '/perfil', '/configuracion', '/cliente-dashboard',
  ]

  const authRoutes = ['/login', '/register', '/recover-password']

  if (protectedRoutes.includes(to.path) && !isAuthenticated.value) {
    return navigateTo('/login')
  }

  if (authRoutes.includes(to.path) && isAuthenticated.value) {
    return navigateTo('/dashboard')
  }
})
