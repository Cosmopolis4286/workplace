import { ref } from 'vue'
import { useApi } from './useApi'

export interface RestaurantInfo {
  id: string
  name: string
  type?: string
  address?: string
  phone?: string
  email?: string
  schedule?: string
  country?: string
  state?: string
  city?: string
  municipality?: string
  parish?: string
}

export interface RestaurantSettings {
  id: string
  commerceId: string
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
  const { get, patch } = useApi()
  const router = useRouter()

  function showSuccess(msg: string) {
    successMsg.value = msg
    setTimeout(() => { successMsg.value = null }, 3000)
  }

  // ─── Load settings ──────────────────────────────────────────────────────────

  async function loadSettings() {
    loading.value = true
    error.value = null
    try {
      const data = await get<FullSettings>('/settings')
      restaurant.value = data.restaurant
      settings.value = data.settings
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar la configuración'
      if (err?.status === 401) router.push('/login')
    } finally {
      loading.value = false
    }
  }

  // ─── Update restaurant info ─────────────────────────────────────────────────

  async function saveRestaurantInfo(data: Partial<RestaurantInfo>): Promise<boolean> {
    saving.value = 'restaurant'
    error.value = null
    try {
      const updated = await patch<RestaurantInfo>('/settings/restaurant', data)
      restaurant.value = updated
      showSuccess('Información del restaurante guardada')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar la información'
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
      const updated = await patch<RestaurantSettings>('/settings/payment', data)
      settings.value = { ...settings.value!, ...updated }
      showSuccess('Configuración de pagos guardada')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar configuración de pagos'
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
      const updated = await patch<RestaurantSettings>('/settings/operations', data)
      settings.value = { ...settings.value!, ...updated }
      showSuccess('Configuración de operaciones guardada')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar configuración de operaciones'
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
      const updated = await patch<RestaurantSettings>('/settings/notifications', data)
      settings.value = { ...settings.value!, ...updated }
      showSuccess('Preferencias de notificaciones guardadas')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar notificaciones'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Module settings (self-service opt-out) ─────────────────────────────────

  async function loadModuleSettings(): Promise<{ availableModules: string[]; disabledModules: string[] } | null> {
    try {
      return await get<{ availableModules: string[]; disabledModules: string[] }>('/settings/modules')
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar los módulos'
      return null
    }
  }

  async function saveModuleSettings(disabledModules: string[]): Promise<boolean> {
    saving.value = 'modules'
    error.value = null
    try {
      await patch('/settings/modules', { disabledModules })
      showSuccess('Módulos actualizados')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar los módulos'
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
    loadModuleSettings,
    saveModuleSettings,
  }
}
