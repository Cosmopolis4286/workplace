import { ref, reactive } from 'vue'
import { useApi } from '../core/useApi'

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
// Por proveedor: guardar CASHEA y KRECE casi simultáneamente con un ref
// global pisaba el mensaje de uno con el del otro sin forma de saber a
// cuál correspondía lo mostrado en pantalla.
const errors = reactive<Record<BnplProvider, string | null>>({ CASHEA: null, KRECE: null })
const successMsgs = reactive<Record<BnplProvider, string | null>>({ CASHEA: null, KRECE: null })
// Error de carga general (no asociado a un proveedor concreto)
const loadError = ref<string | null>(null)

export const useBnplSettings = () => {
  const { get, patch } = useApi()

  function showSuccess(provider: BnplProvider, msg: string) {
    successMsgs[provider] = msg
    setTimeout(() => { successMsgs[provider] = null }, 3000)
  }

  async function loadBnplSettings(): Promise<BnplProviderSettings[]> {
    loading.value = true
    loadError.value = null
    try {
      const data = await get<BnplProviderSettings[]>('/bnpl/settings')
      providerSettings.value = data
      return data
    } catch (err: any) {
      loadError.value = err?.message ?? 'Error al cargar la configuración de financiamiento'
      return []
    } finally {
      loading.value = false
    }
  }

  async function saveBnplSettings(provider: BnplProvider, data: UpsertBnplSettingsPayload): Promise<boolean> {
    saving.value = provider
    errors[provider] = null
    try {
      await patch(`/bnpl/settings/${provider}`, data)
      await loadBnplSettings()
      showSuccess(provider, `Configuración de ${provider} guardada`)
      return true
    } catch (err: any) {
      errors[provider] = err?.message ?? `Error al guardar la configuración de ${provider}`
      return false
    } finally {
      saving.value = null
    }
  }

  return {
    providerSettings,
    loading,
    saving,
    errors,
    successMsgs,
    loadError,
    loadBnplSettings,
    saveBnplSettings,
  }
}
