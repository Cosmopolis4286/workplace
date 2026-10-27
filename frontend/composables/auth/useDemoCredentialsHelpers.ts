/**
 * @fileoverview useDemoCredentialsHelpers - Helpers para el componente DemoCredentials
 * @description Funciones auxiliares extraídas para reducir complejidad del componente
 * @author Lotto38 Team
 * @version 1.0.0
 * @since 2025-10-15
 */

import type { ComputedRef, Reactive } from 'vue'
import type { DemoCredential } from './useDemoCredentials'

interface CopyFeedback {
  admin: string
  commerce: string
  customer: string
  player: string
  all: string
}

/**
 * Helper para obtener credenciales por rol
 */
export const getCredentialsByRole = (
  role: string,
  currentAdminCredentials: ComputedRef<DemoCredential | null>,
  currentCommerceCredentials: ComputedRef<DemoCredential | null>,
  currentCustomerCredentials: ComputedRef<DemoCredential | null>,
  currentPlayerCredentials: ComputedRef<DemoCredential | null>,
): string => {
  const credMap: Record<string, ComputedRef<DemoCredential | null>> = {
    admin: currentAdminCredentials,
    commerce: currentCommerceCredentials,
    customer: currentCustomerCredentials,
    player: currentPlayerCredentials,
  }

  const cred = credMap[role]?.value
  return cred ? `${cred.email}:${cred.password}` : ''
}

/**
 * Helper para mostrar feedback de copiado
 */
export const showCopyFeedback = (
  role: string,
  message: string,
  copyFeedback: Reactive<CopyFeedback>,
) => {
  copyFeedback[role as keyof CopyFeedback] = message
  setTimeout(() => {
    copyFeedback[role as keyof CopyFeedback] = ''
  }, 2000)
}

/**
 * Copiar credenciales al clipboard
 */
export const copyCredentials = async (
  role: string,
  currentAdminCredentials: ComputedRef<DemoCredential | null>,
  currentCommerceCredentials: ComputedRef<DemoCredential | null>,
  currentCustomerCredentials: ComputedRef<DemoCredential | null>,
  currentPlayerCredentials: ComputedRef<DemoCredential | null>,
  copyFeedback: Reactive<CopyFeedback>,
) => {
  if (!import.meta.client) return

  const credentials = getCredentialsByRole(
    role,
    currentAdminCredentials,
    currentCommerceCredentials,
    currentCustomerCredentials,
    currentPlayerCredentials,
  )

  try {
    await navigator.clipboard.writeText(credentials)
    showCopyFeedback(role, 'Copiado!', copyFeedback)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error copying credentials:', error)
    showCopyFeedback(role, 'Error', copyFeedback)
  }
}

/**
 * Copiar todas las credenciales
 */
export const copyAllCredentials = async (
  currentAdminCredentials: ComputedRef<DemoCredential | null>,
  currentCommerceCredentials: ComputedRef<DemoCredential | null>,
  currentCustomerCredentials: ComputedRef<DemoCredential | null>,
  playerCredentials: ComputedRef<DemoCredential[]>,
  copyFeedback: Reactive<CopyFeedback>,
) => {
  if (!import.meta.client) return

  const allCreds = []

  if (currentAdminCredentials.value) {
    allCreds.push(`Admin: ${currentAdminCredentials.value.email} / ${currentAdminCredentials.value.password}`)
  }

  if (currentCommerceCredentials.value) {
    allCreds.push(`Commerce: ${currentCommerceCredentials.value.email} / ${currentCommerceCredentials.value.password}`)
  }

  if (currentCustomerCredentials.value) {
    allCreds.push(`Customer: ${currentCustomerCredentials.value.email} / ${currentCustomerCredentials.value.password}`)
  }

  playerCredentials.value.forEach((player) => {
    allCreds.push(`${player.label}: ${player.email} / ${player.password}`)
  })

  const credentialsText = allCreds.join('\n')

  try {
    await navigator.clipboard.writeText(credentialsText)
    copyFeedback.all = 'Copiadas!'
    setTimeout(() => {
      copyFeedback.all = ''
    }, 2000)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error copying credentials:', error)
    copyFeedback.all = 'Error'
    setTimeout(() => {
      copyFeedback.all = ''
    }, 2000)
  }
}

/**
 * Obtener ruta del dashboard según rol
 */
export const getDashboardRouteByRole = (role?: string): string => {
  if (!role) return '/player/dashboard'

  switch (role.toLowerCase()) {
    case 'admin':
      return '/admin/dashboard'
    case 'commerce':
      return '/commerce/dashboard'
    case 'customer':
      return '/customer/dashboard'
    case 'player':
    default:
      return '/player/dashboard'
  }
}

/**
 * Estadísticas - Inicializar desde localStorage
 */
export const initStats = (usageCount: Ref<number>, lastUsedRole: Ref<string>) => {
  if (import.meta.client) {
    usageCount.value = parseInt(localStorage.getItem('demo-credentials-usage') || '0')
    lastUsedRole.value = localStorage.getItem('demo-credentials-last-role') || ''
  }
}

/**
 * Estadísticas - Guardar en localStorage
 */
export const saveStats = (role: string, usageCount: Ref<number>, lastUsedRole: Ref<string>) => {
  if (import.meta.client) {
    usageCount.value += 1
    lastUsedRole.value = role
    localStorage.setItem('demo-credentials-usage', usageCount.value.toString())
    localStorage.setItem('demo-credentials-last-role', role)
  }
}
