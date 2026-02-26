export interface DemoCredential {
  email: string
  password: string
  restaurantName: string
  description: string
}

interface DemoCredentialsResponse {
  success: boolean
  data: DemoCredential
}

// Singleton state
const credential = ref<DemoCredential | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
let loadPromise: Promise<void> | null = null

export const useDemoCredentials = () => {
  const config = useRuntimeConfig()

  const isAvailable = computed(
    () => process.env.NODE_ENV === 'development' && !!credential.value,
  )

  const loadCredentials = async (): Promise<void> => {
    if (process.env.NODE_ENV !== 'development') return
    if (credential.value) return
    if (loadPromise) return loadPromise

    isLoading.value = true
    error.value = null

    loadPromise = (async () => {
      try {
        const res = await $fetch<DemoCredentialsResponse>(
          `${config.public.apiUrl}/api/auth/demo-credentials`,
        )
        if (res?.success && res.data) {
          credential.value = res.data
        }
      } catch (err: any) {
        error.value = err?.data?.message || 'No se pudieron cargar las credenciales demo'
      } finally {
        isLoading.value = false
        loadPromise = null
      }
    })()

    return loadPromise
  }

  const refresh = async () => {
    credential.value = null
    await loadCredentials()
  }

  onMounted(() => {
    if (process.env.NODE_ENV === 'development') {
      loadCredentials()
    }
  })

  return {
    credential: readonly(credential),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isAvailable,
    loadCredentials,
    refresh,
  }
}

export default useDemoCredentials
