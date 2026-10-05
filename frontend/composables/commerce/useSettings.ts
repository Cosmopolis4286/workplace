import { ref } from 'vue'
import { useApi } from '../core/useApi'

export interface SocialLinks {
  instagram?: string
  facebook?: string
  whatsapp?: string
  tiktok?: string
}

export interface CommerceInfo {
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
  slug?: string | null
  slugUpdatedAt?: string | null
  description?: string | null
  isPublic?: boolean
  socialLinks?: SocialLinks | null
  latitude?: number | null
  longitude?: number | null
}

export interface SlugAvailability {
  available: boolean
  canChange: boolean
  daysLeft: number
  nextChangeAt: string | null
}

export interface CommerceSettings {
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
  targetMarginPct: number
  minMarginPct: number
}

// Settings de un FREELANCER (proveedor de servicios): sin campos de comercio
// físico (tax/delivery/avgPrepTime) ni commerce asociado.
export interface FreelancerSettingsData {
  id: string
  userId: string
  currency: string
  notifyNewRequests: boolean
  notifyRequestUpdates: boolean
  notifyDailyReports: boolean
  notifyCustomerReviews: boolean
  disabledModules: string[]
  slug?: string | null
  slugUpdatedAt?: string | null
  latitude?: number | null
  longitude?: number | null
  // Contenido del perfil público profesional (/pro/:slug) — mismo patrón
  // que CommerceInfo.description/socialLinks.
  description?: string | null
  socialLinks?: SocialLinks | null
}

export interface FullSettings {
  commerce: CommerceInfo | null
  settings: CommerceSettings | FreelancerSettingsData
  // Solo presente para un PROFESIONAL híbrido ("opción 2": Commerce + perfil
  // profesional activo a la vez) — ver SettingsService.getSettings. `settings`
  // ya es CommerceSettings en ese caso; esto trae además el FreelancerSettings
  // (slug /pro/, bio, notificaciones de solicitudes) que el frontend necesita
  // para las tarjetas de la rama profesional.
  freelancerSettings?: FreelancerSettingsData
}

// Global reactive state
const commerce = ref<CommerceInfo | null>(null)
const settings = ref<CommerceSettings | FreelancerSettingsData | null>(null)
const freelancerSettings = ref<FreelancerSettingsData | null>(null)
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
      commerce.value = data.commerce
      settings.value = data.settings
      freelancerSettings.value = data.freelancerSettings ?? null
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar la configuración'
      if (err?.status === 401) router.push('/login')
    } finally {
      loading.value = false
    }
  }

  // ─── Update commerce info ───────────────────────────────────────────────────

  async function saveCommerceInfo(data: Partial<CommerceInfo>): Promise<boolean> {
    saving.value = 'commerce'
    error.value = null
    try {
      const updated = await patch<CommerceInfo>('/settings/commerce', data)
      commerce.value = updated
      showSuccess('Información del comercio guardada')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar la información'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Store slug (/loja/:slug) ───────────────────────────────────────────────

  async function checkSlugAvailability(slug: string): Promise<SlugAvailability | null> {
    try {
      return await get<SlugAvailability>(`/settings/commerce/check-slug?slug=${encodeURIComponent(slug)}`)
    } catch (err: any) {
      error.value = err?.message ?? 'Error al verificar disponibilidad'
      return null
    }
  }

  async function saveCommerceSlug(slug: string): Promise<boolean> {
    saving.value = 'slug'
    error.value = null
    try {
      const updated = await patch<CommerceInfo>('/settings/commerce/slug', { slug })
      commerce.value = updated
      showSuccess('URL de tu tienda guardada')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar la URL de la tienda'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Profile slug (/pro/:slug) ──────────────────────────────────────────────

  async function checkFreelancerSlugAvailability(slug: string): Promise<SlugAvailability | null> {
    try {
      return await get<SlugAvailability>(`/settings/freelancer/check-slug?slug=${encodeURIComponent(slug)}`)
    } catch (err: any) {
      error.value = err?.message ?? 'Error al verificar disponibilidad'
      return null
    }
  }

  // Un PROFESIONAL híbrido ("opción 2") tiene settings.value=CommerceSettings
  // y freelancerSettings.value aparte (ver FullSettings.freelancerSettings) —
  // la respuesta de estos dos endpoints (solo FreelancerSettings) nunca debe
  // mezclarse con settings.value en ese caso, o lo corrompería con un spread
  // de formas distintas. Se actualiza freelancerSettings.value si existe
  // (híbrido), o settings.value si es un freelancer puro (sin Commerce).
  function patchFreelancerData(updated: FreelancerSettingsData) {
    if (freelancerSettings.value) {
      freelancerSettings.value = { ...freelancerSettings.value, ...updated }
    } else {
      settings.value = { ...(settings.value as FreelancerSettingsData | null), ...updated }
    }
  }

  async function saveFreelancerSlug(slug: string): Promise<boolean> {
    saving.value = 'slug'
    error.value = null
    try {
      const updated = await patch<FreelancerSettingsData>('/settings/freelancer/slug', { slug })
      patchFreelancerData(updated)
      showSuccess('URL de tu perfil guardada')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar la URL del perfil'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Freelancer profile info (bio + redes del perfil público) ───────────────

  async function saveFreelancerProfile(data: Partial<Pick<FreelancerSettingsData, 'description' | 'socialLinks'>>): Promise<boolean> {
    saving.value = 'freelancerProfile'
    error.value = null
    try {
      const updated = await patch<FreelancerSettingsData>('/settings/freelancer/profile', data)
      patchFreelancerData(updated)
      showSuccess('Información de tu perfil guardada')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar la información del perfil'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Update payment settings ────────────────────────────────────────────────

  async function savePaymentSettings(data: Partial<CommerceSettings> | Partial<FreelancerSettingsData>): Promise<boolean> {
    saving.value = 'payment'
    error.value = null
    try {
      const updated = await patch<CommerceSettings | FreelancerSettingsData>('/settings/payment', data)
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

  async function saveOperationSettings(data: Partial<CommerceSettings>): Promise<boolean> {
    saving.value = 'operations'
    error.value = null
    try {
      const updated = await patch<CommerceSettings>('/settings/operations', data)
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

  // ─── Update Price Guard settings ────────────────────────────────────────────

  async function savePriceGuardSettings(data: { targetMarginPct?: number; minMarginPct?: number }): Promise<boolean> {
    saving.value = 'priceGuard'
    error.value = null
    try {
      const updated = await patch<CommerceSettings>('/settings/price-guard', data)
      settings.value = { ...settings.value!, ...updated }
      showSuccess('Configuración de Price Guard guardada')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar configuración de Price Guard'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Update notification settings ───────────────────────────────────────────

  async function saveNotificationSettings(data: Record<string, boolean>): Promise<boolean> {
    saving.value = 'notifications'
    error.value = null
    try {
      // El backend actualiza ambos lados para un PROFESIONAL híbrido (ver
      // SettingsService.updateNotificationSettings) pero la respuesta HTTP
      // solo trae la forma de settings.value (CommerceSettings) — se
      // reflejan localmente también los campos de FreelancerSettings
      // (notifyNewRequests/notifyRequestUpdates) si hay un perfil híbrido.
      const updated = await patch<CommerceSettings | FreelancerSettingsData>('/settings/notifications', data)
      settings.value = { ...settings.value!, ...updated }
      if (freelancerSettings.value) {
        freelancerSettings.value = { ...freelancerSettings.value, ...data }
      }
      showSuccess('Preferencias de notificaciones guardadas')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar notificaciones'
      return false
    } finally {
      saving.value = null
    }
  }

  // ─── Ubicación base para MatchingService (distanceScore) ───────────────────

  async function saveLocation(data: { latitude: number; longitude: number }): Promise<boolean> {
    saving.value = 'location'
    error.value = null
    try {
      const updated = await patch<CommerceInfo | FreelancerSettingsData>('/settings/location', data)
      if (commerce.value) {
        commerce.value = { ...commerce.value, ...updated }
      } else {
        settings.value = { ...settings.value!, ...updated }
      }
      showSuccess('Ubicación guardada')
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al guardar la ubicación'
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
    commerce,
    settings,
    freelancerSettings,
    loading,
    saving,
    error,
    successMsg,
    // actions
    loadSettings,
    saveCommerceInfo,
    checkSlugAvailability,
    saveCommerceSlug,
    checkFreelancerSlugAvailability,
    saveFreelancerSlug,
    saveFreelancerProfile,
    savePaymentSettings,
    saveOperationSettings,
    savePriceGuardSettings,
    saveNotificationSettings,
    saveLocation,
    loadModuleSettings,
    saveModuleSettings,
  }
}
