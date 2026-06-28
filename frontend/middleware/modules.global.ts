/**
 * modules middleware
 * Protege rutas según los módulos efectivos del usuario (plan ∩ categoría).
 * Solo aplica a COMMERCE y FREELANCER — ADMIN/SUPERADMIN/NORMAL pasan siempre.
 */

import { navigateTo, defineNuxtRouteMiddleware } from "nuxt/app"
import { useAuth } from "~/composables/useAuth"
import { useModules } from "~/composables/useModules"

// Mapa ruta → módulo requerido
// Debe mantenerse sincronizado con PERMISSION_ROUTE_MAP en middleware/auth.ts
const ROUTE_MODULE_MAP: Record<string, string> = {
  '/menu':                 'menu',
  '/inventario':           'inventory',
  '/pedidos':              'orders',
  '/cliente-dashboard':    'orders',
  '/clientes':             'customers',
  '/agendamientos':        'appointments',
  '/delivery':             'delivery',
  '/gastos':               'expenses',
  '/analytics':            'analytics',
  '/reportes':             'reports',
  '/ventas':               'sales',
  '/empleados':            'employees',
  '/sucursales':           'branches',
  '/servicios':            'services',
  '/solicitudes-servicio': 'service_requests',
  '/corridas':             'corridas',       // ← faltaba
  '/mis-pedidos':          'orders',         // ← faltaba
}

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

  // Find required module for this route
  const requiredModule = Object.entries(ROUTE_MODULE_MAP).find(([route]) =>
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
