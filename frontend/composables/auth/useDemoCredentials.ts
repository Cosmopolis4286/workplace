import { ref, computed, onMounted, readonly } from 'vue'
import { useToast } from '../ui/useToast'
import { getApiErrorMessage } from '../core/useApiErrors'

/**
 * Tipos de credenciales demo disponibles
 */
export interface DemoCredential {
  role: 'SUPERADMIN' | 'ADMIN' | 'PROFESIONAL' | 'NORMAL'
  // Desde el refactor a Role.PROFESIONAL, `role` ya no distingue el tipo de
  // perfil de negocio — esa distinción vive en profileType/subtype, el
  // ProfileType real (ver schema.prisma), no reducido a solo dos valores.
  // Null para SUPERADMIN/ADMIN o un usuario sin ningún perfil activo.
  profileType: 'BUSINESS' | 'PROFESSIONAL' | 'JOB_SEEKER' | 'CUSTOMER' | null
  // Solo aplica cuando profileType=PROFESSIONAL: distingue un freelancer
  // "creativo" (FREELANCER) de uno que presta un servicio operativo
  // (SERVICE_PROVIDER, ej. delivery).
  subtype: 'FREELANCER' | 'SERVICE_PROVIDER' | null
  email: string
  password: string
  label: string
  description: string
  commerceName: string | null
  categoryName?: string | null
  categoryIcon?: string | null
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
        const errorMessage = getApiErrorMessage(err, '')

        // 🔍 Detectar si el error es porque faltan usuarios demo (seed no ejecutado)
        // El backend responde 403 con auth.demo.no_users (traducido: "No se
        // encontraron usuarios demo. Ejecuta: npx prisma db seed" / "No demo
        // users found. Run: npx prisma db seed"): "db seed" está en ambos idiomas.
        if (errorMessage.includes('db seed')) {
          needsSeed.value = true
          error.value = 'Usuarios demo no encontrados. Ejecuta: pnpm seed'

          // 📝 Log informativo en consola (no error) — solo en desarrollo: el
          // comando de seed expone el nombre del contenedor Docker interno,
          // que no debe llegar a la consola de un navegador en producción.
          if (process.dev) {
            console.log('[DemoCredentials] ℹ️ Usuarios demo no disponibles. Seed requerido.')
            console.log('[DemoCredentials] 💡 Ejecuta: docker exec backend-hybrid sh -c "cd /app/backend && npx prisma db seed"')
          }

          // 🔔 Mostrar alerta informativa al usuario
          const { info } = useToast()
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
   * El backend (GET /auth/demo-credentials) es la única fuente de verdad:
   * rechaza con 403 si APP_ENV=production, sin importar USE_DEMO (ver
   * auth.controller.ts). Antes este composable Y el componente que lo usa
   * repetían su propia condición cliente (useDemoCredentials/environment/
   * process.dev) para decidir si siquiera intentar el fetch — bastaba con
   * que UNA variable de entorno quedara mal seteada en el deploy (p.ej. un
   * .env de staging copiado a prod) para que ese chequeo cliente, más laxo
   * que el del backend, mostrara el modal igual. Siempre intentar el fetch
   * y dejar que el 403 del backend sea quien decida evita esa segunda
   * fuente de verdad.
   */
  onMounted(() => {
    loadCredentials()
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