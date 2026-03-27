import { ref, computed, onMounted, readonly } from 'vue'

/**
 * Tipos de credenciales demo disponibles
 */
export interface DemoCredential {
  role: 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'
  email: string
  password: string
  label: string
  description: string
  commerceName: string | null
}

/**
 * Respuesta esperada del backend
 */
interface DemoCredentialsResponse {
  success: boolean
  data: DemoCredential[]
}

/**
 * 🔒 Estado singleton (compartido entre toda la app)
 * Esto evita múltiples requests duplicados
 */
const credentials = ref<DemoCredential[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

/**
 * Cache de promesa para evitar múltiples llamadas concurrentes
 */
let loadPromise: Promise<void> | null = null

export const useDemoCredentials = () => {
  const config = useRuntimeConfig()

  /**
   * 🔥 Detecta entorno de forma segura
   * - Prioriza process.dev (más confiable en Nuxt)
   * - fallback a runtime config si existe
   */
  const isDev =
    process.dev ||
    config.public?.environment === 'development' ||
    config.public?.APP_ENV === 'development'

  /**
   * ✅ Indica si hay credenciales disponibles para mostrar
   */
  const isAvailable = computed(() => {
    return isDev && credentials.value.length > 0
  })

  /**
   * 🚀 Carga credenciales demo desde backend
   */
  const loadCredentials = async (): Promise<void> => {
    // ❌ Nunca ejecutar en producción
    if (!isDev) return

    // ⚡ Evita recargas innecesarias
    if (credentials.value.length > 0) return

    // 🔁 Evita múltiples requests simultáneos
    if (loadPromise) return loadPromise

    isLoading.value = true
    error.value = null

    loadPromise = (async () => {
      try {
        const res = await $fetch<DemoCredentialsResponse>(
          `${config.public.apiUrl}/auth/demo-credentials`,
          {
            method: 'GET',
            timeout: 5000, // ⏱️ evita colgados
          },
        )

        /**
         * ✅ Validación defensiva de respuesta
         */
        if (res?.success && Array.isArray(res.data)) {
          credentials.value = res.data
        } else {
          throw new Error('Formato de respuesta inválido')
        }
      } catch (err: any) {
        /**
         * ⚠️ Manejo de errores robusto
         */
        error.value =
          err?.data?.message ||
          err?.message ||
          'No se pudieron cargar las credenciales demo'

        // Opcional: log en dev
        if (isDev) {
          console.error('[DemoCredentials]', err)
        }
      } finally {
        isLoading.value = false
        loadPromise = null
      }
    })()

    return loadPromise
  }

  /**
   * 🔄 Fuerza recarga (útil para debugging)
   */
  const refresh = async () => {
    credentials.value = []
    await loadCredentials()
  }

  /**
   * 🧠 Auto-load solo en cliente y en dev
   */
  onMounted(() => {
    if (isDev) {
      loadCredentials()
    }
  })

  return {
    /**
     * 🔒 Exposición readonly (evita mutaciones externas)
     */
    credentials: readonly(credentials),
    isLoading: readonly(isLoading),
    error: readonly(error),

    /**
     * Estados derivados
     */
    isAvailable,

    /**
     * Acciones
     */
    loadCredentials,
    refresh,
  }
}

export default useDemoCredentials