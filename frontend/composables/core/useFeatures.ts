import { useApi } from '~/composables/core/useApi'

export interface PlatformFeatures {
  protectedPayments: boolean
  bnpl: boolean
  usageCredits: boolean
}

// Todo apagado hasta que el backend diga lo contrario: si /features falla,
// no se ofrece nada que el backend vaya a rechazar.
const OFF: PlatformFeatures = { protectedPayments: false, bnpl: false, usageCredits: false }

const features = ref<PlatformFeatures>({ ...OFF })
let loading: Promise<PlatformFeatures> | null = null

/** Interruptores de funciones que aplica el backend (GET /features). */
export function useFeatures() {
  if (!loading && import.meta.client) {
    const { get } = useApi()
    loading = get<PlatformFeatures>('/features')
      .then((f) => (features.value = { ...OFF, ...f }))
      .catch(() => features.value)
  }
  return { features: readonly(features), ready: () => loading ?? Promise.resolve(features.value) }
}
