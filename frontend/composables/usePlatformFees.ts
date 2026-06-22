import { ref } from 'vue'
import { useApi } from '~/composables/useApi'

export type FeeTransactionType = 'ORDER' | 'SERVICE_REQUEST' | 'CORRIDA'
export type FeePayer = 'CLIENT' | 'PROVIDER'

export interface PlatformFeeRate {
  id: string
  type: FeeTransactionType
  rate: number
  payer: FeePayer
  isActive: boolean
  updatedById: string | null
  createdAt: string
  updatedAt: string
}

export interface PlatformFeeOverride {
  id: string
  type: FeeTransactionType
  rate: number
  payer: FeePayer | null
  planId: string | null
  userId: string | null
  isActive: boolean
  createdAt: string
  plan?: { id: string; name: string } | null
  user?: { id: string; firstName: string; lastName: string; email: string } | null
}

export const FEE_TYPE_LABELS: Record<FeeTransactionType, string> = {
  ORDER: 'Pedidos',
  SERVICE_REQUEST: 'Solicitudes de servicio',
  CORRIDA: 'Corridas',
}

export const FEE_PAYER_LABELS: Record<FeePayer, string> = {
  CLIENT: 'Cliente (se suma al precio)',
  PROVIDER: 'Proveedor (se descuenta de su billetera)',
}

// Tasas públicas (solo payer=CLIENT) — singleton compartido entre los modales
// de creación para mostrar el desglose de precio antes de confirmar.
const publicRates = ref<{ type: FeeTransactionType; rate: number }[]>([])
let loadedPublic = false

export interface UserSearchResult {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export function usePlatformFees() {
  const { get, put, post, del } = useApi()

  async function searchUsers(search: string): Promise<UserSearchResult[]> {
    if (!search.trim()) return []
    const res = await get<{ data: UserSearchResult[] }>(`/users?search=${encodeURIComponent(search)}&limit=10`)
    return res.data
  }

  async function fetchPublicRates(force = false) {
    if (loadedPublic && !force) return
    try {
      publicRates.value = await get('/platform-fees/rates/public')
      loadedPublic = true
    } catch {
      // no bloquea el flujo si falla — simplemente no se muestra desglose
    }
  }

  function getClientFeeFor(type: FeeTransactionType, baseAmount: number) {
    const found = publicRates.value.find(r => r.type === type)
    if (!found) return null
    const feeAmount = Math.round(baseAmount * (found.rate / 100) * 100) / 100
    return { rate: found.rate, feeAmount }
  }

  // ─── Admin ────────────────────────────────────────────────────────────────

  async function fetchRates(): Promise<PlatformFeeRate[]> {
    return get('/platform-fees/rates')
  }

  async function upsertRate(type: FeeTransactionType, rate: number, payer: FeePayer): Promise<PlatformFeeRate> {
    return put(`/platform-fees/rates/${type}`, { rate, payer })
  }

  async function fetchOverrides(): Promise<PlatformFeeOverride[]> {
    return get('/platform-fees/overrides')
  }

  async function createOverride(dto: { type: FeeTransactionType; rate: number; payer?: FeePayer; planId?: string; userId?: string }): Promise<PlatformFeeOverride> {
    return post('/platform-fees/overrides', dto)
  }

  async function deleteOverride(id: string): Promise<void> {
    await del(`/platform-fees/overrides/${id}`)
  }

  return {
    publicRates,
    fetchPublicRates,
    getClientFeeFor,
    fetchRates,
    upsertRate,
    fetchOverrides,
    createOverride,
    deleteOverride,
    searchUsers,
  }
}
