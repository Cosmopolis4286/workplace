import { navigateTo, defineNuxtRouteMiddleware } from 'nuxt/app'

const ROUTE_REDIRECTS: Record<string, string> = {
  '/permisos/usuarios': '/permissions/users',
  '/modulos': '/modules',
  '/permisos': '/permissions',
  '/planes': '/plans',
  '/categorias-propuestas-admin': '/proposed-categories-admin',
  '/categorias': '/categories',
  '/terminos': '/terms',
  '/soporte': '/support',
  '/privacidad': '/privacy',
  '/eliminar-cuenta': '/account-deletion',
  '/verificacion': '/verification',
  '/comisiones': '/commissions',
  '/auditoria': '/audit-log',
  '/mis-pedidos': '/my-orders',
  '/reportar-problema': '/report-issue',
  '/cliente-dashboard': '/customer-dashboard',
  '/perfil': '/profile',
  '/caja': '/cash-register',
  '/configuracion': '/settings',
  '/billetera': '/wallet',
  '/clientes': '/customers',
  '/corridas': '/rides',
  '/empleados': '/employees',
  '/gastos': '/expenses',
  '/inventario': '/inventory',
  '/localidades': '/locations',
  '/mi-plan': '/my-plan',
  '/pedidos': '/orders',
  '/precios': '/pricing',
  '/reportes': '/reports',
  '/sucursales': '/branches',
  '/tasas-cambio': '/exchange-rates',
  '/usuarios': '/users',
  '/ventas': '/sales',
  '/agendamientos': '/appointments',
  '/solicitudes-servicio-admin': '/service-requests-admin',
  '/solicitudes-servicio': '/service-requests',
  '/servicios': '/my-services',
  '/bnpl/simulado': '/bnpl/simulated',
}

// Prefijo más largo primero, para que '/permisos/usuarios' se pruebe antes que '/permisos'.
const SORTED_ENTRIES = Object.entries(ROUTE_REDIRECTS).sort((a, b) => b[0].length - a[0].length)

export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return
  const path = to.path as string
  for (const [oldPrefix, newPrefix] of SORTED_ENTRIES) {
    if (path === oldPrefix || path.startsWith(oldPrefix + '/')) {
      const rest = path.slice(oldPrefix.length)
      const target = newPrefix + rest + (to.fullPath.includes('?') ? '?' + to.fullPath.split('?')[1] : '')
      return navigateTo(target, { redirectCode: 301 })
    }
  }
})
