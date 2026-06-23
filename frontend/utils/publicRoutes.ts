// Rutas accesibles sin sesión activa. Single source of truth compartida entre
// middleware/auth.ts y layouts/default.vue — ambos deben coincidir en qué
// rutas NO requieren autenticación.
export const PUBLIC_ROUTES: string[] = [
  '/', '/precios', '/login', '/register',
  '/recover-password', '/reset-password',
  '/verify-email', '/auth/google/callback', '/auth/2fa-verify',
  '/privacidad', '/terminos', '/soporte',
]

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(r => path === r) || path.startsWith('/p/')
}
