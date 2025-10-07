export default defineNuxtRouteMiddleware((to, from) => {
  // Skip middleware on server-side rendering
  if (process.server) return
  
  const { isAuthenticated } = useAuth()
  
  // Protected routes
  const protectedRoutes = ['/', '/menu', '/inventario', '/gastos', '/ventas', '/analytics', '/reportes', '/agendamientos', '/clientes', '/delivery']
  
  // Check if current route is protected
  if (protectedRoutes.includes(to.path) && !isAuthenticated.value) {
    return navigateTo('/login')
  }
  
  // Redirect authenticated users away from auth pages
  const authRoutes = ['/login', '/register', '/recover-password']
  if (authRoutes.includes(to.path) && isAuthenticated.value) {
    return navigateTo('/')
  }
})