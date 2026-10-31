import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { resetWallets } from '../wallets/useWallets'
import type { ProfileActivation } from '../users/useProfileActivations'

interface Commerce {
  id: string
  name: string
  type?: string
  address?: string
  phone?: string
}

// Prerrequisitos operativos — mismos hechos que exigen los guards del backend
// (CapabilitiesService / capabilitiesFrom). Usar esto, no accountType, para
// "¿muestro algo que opera sobre un Commerce?": con la "opción 2" un
// profesional que vende producto tiene Commerce sin ser BUSINESS.
export type Capability = 'HAS_COMMERCE' | 'HAS_PROFESSIONAL_PROFILE' | 'HAS_BUSINESS_PROFILE'
export type CapabilityMap = Record<Capability, boolean>

export interface User {
  id: string
  email: string
  username?: string
  usernameUpdatedAt?: string
  firstName: string
  lastName: string
  phone?: string
  avatar?: string
  role: 'SUPERADMIN' | 'ADMIN' | 'PROFESIONAL' | 'NORMAL'
  // role ya no distingue "tiene Commerce" de "es freelancer/service
  // provider" (ambos son PROFESIONAL) — accountType (resuelto por el
  // backend vía AccountTypeResolver, viene solo en GET /auth/me) es la
  // fuente para esa distinción fina. Puede venir undefined en respuestas
  // que no pasan por getProfile (login/register no lo incluyen todavía).
  accountType?: 'COMMERCE' | 'FREELANCER' | null
  // Todos los UserProfile ACTIVE del usuario (incluye CUSTOMER/JOB_SEEKER,
  // no solo los que determinan accountType) — mismo shape que useProfileActivations
  // (ProfileActivation), reutilizado acá en vez de duplicar el tipo. Ver
  // useProfileContext() para helpers de consulta. Mismo caveat que
  // accountType: solo viene en GET /auth/me, undefined en login/register.
  profiles?: ProfileActivation[]
  // Solo viene en GET /auth/me (mismo caveat que accountType). Ver
  // hasCapability() en useProfileContext.
  capabilities?: CapabilityMap
  // Contexto de UX activo ("estoy usando WorkPlace como..."), ver
  // useProfileContext(). Puramente presentacional — null hasta que el
  // usuario elige uno explícitamente vía PATCH /profile-activations/active.
  activeProfileId?: string | null
  isActive: boolean
  emailVerified?: boolean
  commerce?: Commerce
  categoryId?: string
  category?: { id: string; name: string; icon?: string | null } | null
  country?: string
  state?: string
  city?: string
  municipality?: string
  parish?: string
  // Ubicación fijada en un selector de mapa, para MatchingService
  // (distanceScore en /search/suggest) — ver LocationPickerMap.vue.
  latitude?: number | null
  longitude?: number | null
  twoFactorEnabled?: boolean
  profileSettings?: {
    showCatalog: boolean
    showServices: boolean
    quickAccessIds: string[]
    dashboardQuickActionIds: string[]
  } | null
}

interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true
  sessionId: string
}

interface RegisterCredentials {
  firstName: string
  lastName: string
  email: string
  birthDate: string
  sex: 'MALE' | 'FEMALE' | 'OTHER'
  password: string
  acceptTerms: boolean
  recaptchaToken?: string
}

interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
  recaptchaToken?: string
}

interface UpdateProfilePayload {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  username?: string
  country?: string
  state?: string
  city?: string
  municipality?: string
  parish?: string
  // Ubicación fijada en un selector de mapa, para MatchingService
  // (distanceScore en /search/suggest) — ver LocationPickerMap.vue.
  latitude?: number
  longitude?: number
}

interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface Session {
  id: string
  ipAddress?: string | null
  deviceInfo?: string | null
  createdAt: string
  expiresAt: string
  isCurrent: boolean
}

// Estado global reactivo compartido entre todas las instancias
const currentUser = ref<User | null>(null)
const accessToken = ref<string | null>(null)
const refreshToken = ref<string | null>(null)
const initialized = ref(false)

// El middleware de rutas espera esta promesa antes de decidir si una ruta
// protegida se permite, para no confiar ciegamente en el currentUser
// cacheado en localStorage mientras el servidor no confirme la sesión.
let sessionVerification: Promise<void> | null = null

function rehydrate(): void {
  if (initialized.value || !process.client) return
  initialized.value = true
  const isNative = Capacitor.isNativePlatform()
  try {
    const storedUser = localStorage.getItem('auth_user')
    if (storedUser) currentUser.value = JSON.parse(storedUser) as User

    if (isNative) {
      const storedAccess = localStorage.getItem('auth_access_token')
      const storedRefresh = localStorage.getItem('auth_refresh_token')
      if (storedUser && storedAccess) {
        accessToken.value = storedAccess
        refreshToken.value = storedRefresh
      } else {
        currentUser.value = null
      }
    }
  } catch {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_access_token')
    localStorage.removeItem('auth_refresh_token')
  }
}

export const useAuth = () => {
  // useRuntimeConfig debe llamarse dentro del composable (contexto Nuxt)
  // El plugin runtime-config-host.client.ts ajusta apiUrl si la página se
  // abrió desde otro host (LAN/móvil) y apiUrl apuntaba a "localhost".
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  rehydrate()

  const isNative = process.client ? Capacitor.isNativePlatform() : false

  const user = computed(() => currentUser.value)
  const isAuthenticated = computed(() => !!currentUser.value)
  const commerce = computed(() => currentUser.value?.commerce)
  const token = computed(() => accessToken.value)

  function setSession(data: AuthResponse): void {
    currentUser.value = data.user
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken
    if (process.client) {
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      if (isNative) {
        localStorage.setItem('auth_access_token', data.accessToken)
        localStorage.setItem('auth_refresh_token', data.refreshToken)
      }
      // La respuesta de login/register/2FA no trae profiles/capabilities/
      // accountType (solo GET /auth/me). Sin esto, el dashboard caía al hero
      // de "Cliente" y ocultaba widgets/acciones de perfil profesional; y tras
      // logout + login con otra cuenta en la misma pestaña, la verificación
      // memoizada de la sesión anterior impedía volver a pedir /auth/me.
      sessionVerification = fetchProfile().then(() => undefined)
    }
  }

  function clearSession(): void {
    sessionVerification = null
    currentUser.value = null
    accessToken.value = null
    refreshToken.value = null
    if (process.client) {
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_access_token')
      localStorage.removeItem('auth_refresh_token')
    }
  }

  function getHeaders(): Record<string, string> {
    return accessToken.value
      ? { Authorization: `Bearer ${accessToken.value}` }
      : {}
  }

  // Wrapper para llamadas autenticadas: reintenta una vez tras refrescar el
  // token si el servidor responde 401. Reemplaza al interceptor global que
  // parcheaba $fetch (plugins/auth-refresh.client.ts, eliminado por duplicar
  // esta misma lógica para cada llamada de este archivo).
  async function authFetch<T>(url: string, options: Record<string, any> = {}): Promise<T> {
    try {
      return (await $fetch<T>(url, { ...options, headers: { ...getHeaders(), ...(options.headers ?? {}) } })) as T
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number })?.status
        ?? (err as { status?: number; statusCode?: number })?.statusCode
      if (status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) throw err
        return (await $fetch<T>(url, { ...options, headers: { ...getHeaders(), ...(options.headers ?? {}) } })) as T
      }
      // JWT válido pero sesión en Redis expirada por inactividad (ver
      // jwt.strategy.ts) — el backend devuelve 403 con este mensaje
      // específico; refrescar el token no ayuda, hay que forzar login.
      const message = (err as { data?: { message?: string }; message?: string })?.data?.message
        ?? (err as { message?: string })?.message
      if (status === 403 && typeof message === 'string' && message.includes('inactividad')) {
        clearSession()
        if (process.client) useRouter().push('/login')
      }
      throw err
    }
  }

  async function register(credentials: RegisterCredentials): Promise<User> {
    const data = await $fetch<AuthResponse>(`${apiUrl}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      body: {
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        email: credentials.email,
        birthDate: credentials.birthDate,
        sex: credentials.sex,
        password: credentials.password,
        acceptTerms: credentials.acceptTerms,
        recaptchaToken: credentials.recaptchaToken,
      },
    })
    setSession(data)
    useModules().invalidate()
    // invalidate() solo pone loaded=false — si el sidebar ya está montado
    // (SPA, sin recarga de página), nadie vuelve a llamar loadNavigation()
    // reactivamente, así que se dispara acá explícitamente (loadNavigation
    // ya es un no-op si loaded=true, por eso es seguro encadenarlo siempre).
    const nav = useNavigation()
    nav.invalidate()
    nav.loadNavigation()
    usePermissions().reloadPermissions().catch(() => {})
    return data.user
  }

  async function login(credentials: LoginCredentials): Promise<User | TwoFactorRequiredResponse> {
    const data = await $fetch<AuthResponse | TwoFactorRequiredResponse>(`${apiUrl}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: {
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
        recaptchaToken: credentials.recaptchaToken,
      },
    })
    if ('requiresTwoFactor' in data) return data
    setSession(data)
    useModules().invalidate()
    const nav = useNavigation()
    nav.invalidate()
    nav.loadNavigation()
    usePermissions().reloadPermissions().catch(() => {})
    return data.user
  }

  async function verifyTwoFactor(sessionId: string, code: string): Promise<User> {
    const data = await $fetch<AuthResponse>(`${apiUrl}/auth/2fa/verify-login`, {
      method: 'POST',
      credentials: 'include',
      body: { sessionId, code },
    })
    setSession(data)
    useModules().invalidate()
    const nav = useNavigation()
    nav.invalidate()
    nav.loadNavigation()
    usePermissions().reloadPermissions().catch(() => {})
    return data.user
  }

  async function setupTwoFactor(): Promise<{ secret: string; qrCodeDataUrl: string; otpAuthUrl: string }> {
    return authFetch(`${apiUrl}/auth/2fa/setup`, {
      method: 'POST',
      credentials: 'include',
    })
  }

  async function enableTwoFactor(code: string): Promise<{ enabled: true; backupCodes: string[] }> {
    return authFetch(`${apiUrl}/auth/2fa/enable`, {
      method: 'POST',
      credentials: 'include',
      body: { code },
    })
  }

  async function disableTwoFactor(password: string, code: string): Promise<{ enabled: false }> {
    const result = await authFetch<{ enabled: false }>(`${apiUrl}/auth/2fa/disable`, {
      method: 'POST',
      credentials: 'include',
      body: { password, code },
    })
    if (currentUser.value) updateLocalUser({ twoFactorEnabled: false } as Partial<User>)
    return result
  }

  async function logout(): Promise<void> {
    const loggedOutUserId = currentUser.value?.id
    try {
      if (accessToken.value || !isNative) {
        await $fetch(`${apiUrl}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: getHeaders(),
        })
      }
    } catch {
      // Limpiar sesión aunque falle la petición
    } finally {
      clearSession()
      usePermissions().clearPermissions()
      useModules().invalidate()
      useNavigation().invalidate()
      resetWallets()
      // Progreso de onboarding namespaced por userId (ver pages/onboarding.vue) —
      // se limpia al cerrar sesión para no acumular basura en localStorage.
      if (process.client && loggedOutUserId) {
        for (const suffix of ['step', 'completed', 'category', 'subcategory', 'plan']) {
          localStorage.removeItem(`onboarding_${suffix}_${loggedOutUserId}`)
        }
      }
    }
  }

  async function refreshAccessToken(): Promise<boolean> {
    if (isNative && !refreshToken.value) return false
    try {
      const data = await $fetch<Pick<AuthResponse, 'accessToken' | 'refreshToken'>>(
        `${apiUrl}/auth/refresh`,
        {
          method: 'POST',
          credentials: 'include',
          body: refreshToken.value ? { refreshToken: refreshToken.value } : undefined,
        },
      )
      accessToken.value = data.accessToken
      refreshToken.value = data.refreshToken
      if (process.client && isNative) {
        localStorage.setItem('auth_access_token', data.accessToken)
        localStorage.setItem('auth_refresh_token', data.refreshToken)
      }
      return true
    } catch {
      clearSession()
      return false
    }
  }

  async function fetchProfile(): Promise<User | null> {
    try {
      const profile = await authFetch<User>(`${apiUrl}/auth/me`, { credentials: 'include' })
      currentUser.value = profile
      if (process.client) localStorage.setItem('auth_user', JSON.stringify(profile))
      return profile
    } catch {
      return null
    }
  }

  // Confirma con el servidor que la sesión cacheada en localStorage sigue
  // siendo válida. Se ejecuta una sola vez por carga de la app (las llamadas
  // subsecuentes reciben la misma promesa ya resuelta) para que el middleware
  // de rutas no deje pasar a páginas protegidas con un usuario "fantasma"
  // cuyo token ya expiró.
  function ensureSessionVerified(): Promise<void> {
    if (!process.client) return Promise.resolve()
    if (!currentUser.value) return Promise.resolve()
    if (!sessionVerification) {
      sessionVerification = fetchProfile().then(() => undefined)
    }
    return sessionVerification
  }

  function updateLocalUser(data: Partial<User>): void {
    if (!currentUser.value) return
    currentUser.value = { ...currentUser.value, ...data }
    if (process.client) {
      localStorage.setItem('auth_user', JSON.stringify(currentUser.value))
    }
  }

  async function saveProfile(payload: UpdateProfilePayload): Promise<User> {
    const updated = await authFetch<User>(`${apiUrl}/auth/me`, {
      method: 'PATCH',
      credentials: 'include',
      body: payload,
    })
    currentUser.value = updated
    if (process.client) localStorage.setItem('auth_user', JSON.stringify(updated))
    return updated
  }

  async function changePassword(payload: ChangePasswordPayload): Promise<void> {
    await authFetch(`${apiUrl}/auth/change-password`, {
      method: 'PATCH',
      credentials: 'include',
      body: payload,
    })
  }

  // Qué impide hoy borrar la cuenta (saldo, pagos protegidos, depósitos…).
  async function getAccountDeletionBlockers(): Promise<string[]> {
    const res = await authFetch<{ blockers: string[] }>(`${apiUrl}/auth/me/deletion-check`, {
      credentials: 'include',
    })
    return res.blockers
  }

  // Elimina la cuenta (anonimiza y desactiva en el backend) y cierra la
  // sesión local: el backend ya borró las cookies y revocó los tokens.
  async function deleteAccount(): Promise<void> {
    await authFetch(`${apiUrl}/auth/me`, {
      method: 'DELETE',
      credentials: 'include',
      body: { confirmation: 'ELIMINAR' },
    })
    clearSession()
  }

  async function checkUsername(username: string): Promise<{ available: boolean; canChange: boolean; daysLeft: number; nextChangeAt: string | null }> {
    return authFetch<{ available: boolean; canChange: boolean; daysLeft: number; nextChangeAt: string | null }>(
      `${apiUrl}/auth/check-username?username=${encodeURIComponent(username)}`,
      { credentials: 'include' },
    )
  }

  async function getSessions(): Promise<Session[]> {
    return authFetch<Session[]>(`${apiUrl}/auth/sessions`, { credentials: 'include' })
  }

  async function revokeSession(id: string): Promise<void> {
    await authFetch(`${apiUrl}/auth/sessions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
  }

  async function revokeAllSessions(): Promise<void> {
    await authFetch(`${apiUrl}/auth/sessions`, {
      method: 'DELETE',
      credentials: 'include',
    })
  }

  async function uploadAvatar(file: File): Promise<User> {
    const formData = new FormData()
    formData.append('avatar', file)
    const updated = await authFetch<User>(`${apiUrl}/auth/me/avatar`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    currentUser.value = updated
    if (process.client) localStorage.setItem('auth_user', JSON.stringify(updated))
    return updated
  }

  return {
    user,
    isAuthenticated,
    commerce,
    token,
    currentUser,
    login,
    register,
    logout,
    setSession,
    clearSession,
    updateLocalUser,
    saveProfile,
    changePassword,
    getAccountDeletionBlockers,
    deleteAccount,
    getSessions,
    revokeSession,
    uploadAvatar,
    fetchProfile,
    ensureSessionVerified,
    refreshAccessToken,
    getHeaders,
    checkUsername,
    verifyTwoFactor,
    setupTwoFactor,
    enableTwoFactor,
    disableTwoFactor,
    revokeAllSessions,
  }
}
