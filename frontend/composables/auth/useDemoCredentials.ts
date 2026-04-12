import { ref, computed, onMounted, readonly } from 'vue'
import { useAlert } from '../useAlert'

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
  categoryName?: string | null
  subcategoryName?: string | null
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
const needsSeed = ref(false)

/**
 * Cache de promesa para evitar múltiples llamadas concurrentes
 */
let loadPromise: Promise<void> | null = null

export const useDemoCredentials = () => {
  const config = useRuntimeConfig()

  /**
   * ✅ Indica si hay credenciales disponibles para mostrar
   */
  const isAvailable = computed(() => {
    return credentials.value.length > 0
  })

  /**
   * 🚀 Carga credenciales demo desde backend
   */
  const loadCredentials = async (): Promise<void> => {
    // 🔥 HOTFIX: Permitir en producción si backend tiene credenciales

    // ⚡ Evita recargas innecesarias
    if (credentials.value.length > 0) return

    // 🔁 Evita múltiples requests simultáneos
    if (loadPromise) return loadPromise

    isLoading.value = true
    error.value = null
    needsSeed.value = false

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
        const errorMessage = err?.data?.message || err?.message || ''

        // 🔍 Detectar si el error es porque faltan usuarios demo (seed no ejecutado)
        if (errorMessage.includes('Demo users not found') || errorMessage.includes('Run: pnpm seed')) {
          needsSeed.value = true
          error.value = 'Usuarios demo no encontrados. Ejecuta: pnpm seed'

          // 📝 Log informativo en consola (no error)
          console.log('[DemoCredentials] ℹ️ Usuarios demo no disponibles. Seed requerido.')
          console.log('[DemoCredentials] 💡 Ejecuta: docker exec backend-hybrid sh -c "cd /app/backend && npx prisma db seed"')

          // 🔔 Mostrar alerta informativa al usuario
          const { info } = useAlert()
          info(
            'Demo no disponible',
            'Los usuarios de demostración no están configurados. Ejecuta el seed para usarlos.'
          )
        } else {
          error.value = errorMessage || 'No se pudieron cargar las credenciales demo'

          // Solo loguear errores en desarrollo
          if (process.dev) {
            console.error('[DemoCredentials] ❌', err)
          }
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
   * 🧠 Auto-load solo si USE_DEMO=true o entorno de desarrollo
   */
  onMounted(() => {
    const isDemoEnabled =
      config.public?.useDemoCredentials === true ||
      config.public?.environment === 'development' ||
      process.dev

    if (isDemoEnabled) {
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
    needsSeed: readonly(needsSeed),

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