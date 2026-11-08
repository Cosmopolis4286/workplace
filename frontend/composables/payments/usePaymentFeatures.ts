/**
 * Qué modos de pago ofrece la plataforma (backend: GET /payments/features).
 * Pago Protegido está apagado salvo que el servidor lo encienda: mientras no
 * haya un aliado autorizado que custodie la garantía, la plataforma no recibe
 * dinero de terceros. Se pide una vez por sesión.
 */
import { useApi } from '../core/useApi'

const protectedPayments = ref(false)
let loaded: Promise<void> | null = null

export function usePaymentFeatures() {
  const { get } = useApi()

  function load() {
    loaded ??= get<{ protectedPayments: boolean }>('/payments/features')
      .then(f => { protectedPayments.value = !!f.protectedPayments })
      .catch(() => { protectedPayments.value = false; loaded = null })
    return loaded
  }
  load()

  return { protectedPayments: readonly(protectedPayments), load }
}
