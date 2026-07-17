import { ref } from 'vue'
import { useApi } from './useApi'

export type BnplProvider = 'CASHEA' | 'KRECE'

export interface BnplProviderSettings {
  provider: BnplProvider
  isEnabled: boolean
  isSimulated: boolean
  hasPrivateKey: boolean
  storeId: string | null
  storeName: string | null
  lastVerifiedAt: string | null
}

export interface UpsertBnplSettingsPayload {
  isEnabled?: boolean
  publicApiKey?: string
  privateApiKey?: string
  storeId?: string
  storeName?: string
  externalClientId?: string
}

const providerSettings = ref<BnplProviderSettings[]>([])
const loading = ref(false)
const saving = ref<BnplProvider | null>(null)
const error = ref<string | null>(null)
const successMsg = ref<string | null>(null)

export const useBnplSettings = () => {
  const { get, patch } = useApi()

  function showSuccess(msg: string) {
    successMsg.value = msg
    setTimeout(() => { successMsg.value = null }, 3000)
  }

  async function loadBnplSettings(): Promise<BnplProviderSettings[]> {
    loading.value = true
    error.value = null
    try {
      const data = await get<BnplProviderSettings[]>('/bnpl/settings')
      providerSettings.value = data
      return data
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar la configuración de financiamiento'
      return []
    } finally {
      loading.value = false
    }
  }

  async function saveBnplSettings(provider: BnplProvider, data: UpsertBnplSettingsPayload): Promise<boolean> {
    saving.value = provider
    error.value = null
    try {
      await patch(`/bnpl/settings/${provider}`, data)
      await loadBnplSettings()
      showSuccess(`Configuración de ${provider} guardada`)
      return true
    } catch (err: any) {
      error.value = err?.message ?? `Error al guardar la configuración de ${provider}`
      return false
    } finally {
      saving.value = null
    }
  }

  return {
    providerSettings,
    loading,
    saving,
    error,
    successMsg,
    loadBnplSettings,
    saveBnplSettings,
  }
}
