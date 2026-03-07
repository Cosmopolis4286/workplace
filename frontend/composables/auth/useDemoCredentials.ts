export interface DemoCredential {
  role: 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'
  email: string
  password: string
  label: string
  description: string
  commerceName: string | null
}

interface DemoCredentialsResponse {
  success: boolean
  data: DemoCredential[]
}

// Singleton state
const credentials = ref<DemoCredential[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)
let loadPromise: Promise<void> | null = null

export const useDemoCredentials = () => {
  const config = useRuntimeConfig()

  const isAvailable = computed(
    () => process.env.NODE_ENV === 'development' && credentials.value.length > 0,
  )

  const loadCredentials = async (): Promise<void> => {
    if (process.env.NODE_ENV !== 'development') return
    if (credentials.value.length > 0) return
    if (loadPromise) return loadPromise

    isLoading.value = true
    error.value = null

    loadPromise = (async () => {
      try {
        const res = await $fetch<DemoCredentialsResponse>(
          `${config.public.apiUrl}/api/auth/demo-credentials`,
        )
        if (res?.success && res.data) {
          credentials.value = res.data
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
    credentials.value = []
    await loadCredentials()
  }

  onMounted(() => {
    if (process.env.NODE_ENV === 'development') {
      loadCredentials()
    }
  })

  return {
    credentials: readonly(credentials),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isAvailable,
    loadCredentials,
    refresh,
  }
}

export default useDemoCredentials
