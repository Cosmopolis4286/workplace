/**
 * La billetera solo existe con el Pago Protegido encendido
 * (PROTECTED_PAYMENTS_ENABLED en el backend, leído vía GET /features). Con el
 * interruptor apagado la plataforma no custodia fondos: sus pantallas no se
 * abren aunque alguien escriba la URL (el backend además responde 403).
 */
import { defineNuxtRouteMiddleware, navigateTo } from 'nuxt/app'
import { useFeatures } from '~/composables/core/useFeatures'

const WALLET_ROUTES = ['/wallet', '/wallets-admin', '/wallet-deposit-requests-admin']

export default defineNuxtRouteMiddleware(async (to: any) => {
  if (process.server) return
  const isWalletRoute = WALLET_ROUTES.some(
    (route) => to.path === route || to.path.startsWith(`${route}/`)
  )
  if (!isWalletRoute) return

  const features = await useFeatures().ready()
  if (!features.protectedPayments) return navigateTo('/dashboard')
})
