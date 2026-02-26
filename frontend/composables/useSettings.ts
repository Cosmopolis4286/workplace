import { ref } from 'vue'
import { useAuth } from './useAuth'

export interface RestaurantInfo {
  id: string
  name: string
  type?: string
  address?: string
  phone?: string
  email?: string
  schedule?: string
}

export interface RestaurantSettings {
  id: string
  restaurantId: string
  currency: string
  tax: number
  suggestedTip: number
  paymentMethods: string[]
  avgPrepTime: number
  avgDeliveryTime: number
  deliveryFee: number
  freeDeliveryMinimum: number
  notifyNewOrders: boolean
  notifyLowStock: boolean
  notifyDailyReports: boolean
  notifyCustomerReviews: boolean
}

export interface FullSettings {
  restaurant: RestaurantInfo
  settings: RestaurantSettings
}

// Global reactive state
const restaurant = ref<RestaurantInfo | null>(null)
const settings = ref<RestaurantSettings | null>(null)
const loading = ref(false)
const saving = ref<string | null>(null)  // tracks which section is saving
const error = ref<string | null>(null)
const successMsg = ref<string | null>(null)

export const useSettings = () => {
  const { getHeaders, refreshAccessToken } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const router = useRouter()

  // ─── API helper ────────────────────────────────────────────────────────────

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...getHeaders(),
      ...(options.headers as Record<string, string> || {}),
    }
    return $fetch<T>(`${apiUrl}/api/settings${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
  }

  async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number })?.status
        ?? (err as { status?: number; statusCode?: number })?.statusCode
      if (status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          router.push('/login')
          throw err
        }
        return await fn()
      }
      throw err
    }
  }

  function showSuccess(msg: string) {
    successMsg.value = msg
    setTimeout(() => { successMsg.value = null }, 3000)
  }

  // ─── Load settings ──────────────────────────────────────────────────────────

  async function loadSettings() {
    loading.value = true
    error.value = null
    try {
      const data = await withAuthRetry(() => apiFetch<FullSettings>('/'))
      restaurant.value = data.restaurant
      settings.value = data.settings
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cargar la configuración'
    } finally {
      loading.value = false
    }
  }

  // ─── Update restaurant info ─────────────────────────────────────────────────

  async function saveRestaurantInfo(data: Partial<RestaurantInfo>): Promise<boolean> {
    saving.value = 'restaurant'
    error.value = null
    try {
      const updated = await withAuthRetry(() =>
        apiFetch<RestaurantInfo>('/restaurant', { method: 'PATCH', body: JSON.stringify(data) }),
      )
      restaurant.value = updated
      showSuccess('Información del restaurante guardada')
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al guardar la información'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Update payment settings ────────────────────────────────────────────────

  async function savePaymentSettings(data: Partial<RestaurantSettings>): Promise<boolean> {
    saving.value = 'payment'
    error.value = null
    try {
      const updated = await withAuthRetry(() =>
        apiFetch<RestaurantSettings>('/payment', { method: 'PATCH', body: JSON.stringify(data) }),
      )
      settings.value = { ...settings.value!, ...updated }
      showSuccess('Configuración de pagos guardada')
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al guardar configuración de pagos'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Update operation settings ──────────────────────────────────────────────

  async function saveOperationSettings(data: Partial<RestaurantSettings>): Promise<boolean> {
    saving.value = 'operations'
    error.value = null
    try {
      const updated = await withAuthRetry(() =>
        apiFetch<RestaurantSettings>('/operations', { method: 'PATCH', body: JSON.stringify(data) }),
      )
      settings.value = { ...settings.value!, ...updated }
      showSuccess('Configuración de operaciones guardada')
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al guardar configuración de operaciones'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Update notification settings ───────────────────────────────────────────

  async function saveNotificationSettings(data: Partial<RestaurantSettings>): Promise<boolean> {
    saving.value = 'notifications'
    error.value = null
    try {
      const updated = await withAuthRetry(() =>
        apiFetch<RestaurantSettings>('/notifications', { method: 'PATCH', body: JSON.stringify(data) }),
      )
      settings.value = { ...settings.value!, ...updated }
      showSuccess('Preferencias de notificaciones guardadas')
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al guardar notificaciones'
      return false
    } finally {
      saving.value = null
    }
  }

  return {
    // state
    restaurant,
    settings,
    loading,
    saving,
    error,
    successMsg,
    // actions
    loadSettings,
    saveRestaurantInfo,
    savePaymentSettings,
    saveOperationSettings,
    saveNotificationSettings,
  }
}
