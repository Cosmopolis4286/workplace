import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'
import { resetWallets } from '../wallets/useWallets'

interface Commerce {
  id: string
  name: string
  type?: string
  address?: string
  phone?: string
}

export interface User {
  id: string
  email: string
  username?: string
  usernameUpdatedAt?: string
  firstName: string
  lastName: string
  phone?: string
  avatar?: string
  role: 'SUPERADMIN' | 'ADMIN' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'
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
}

interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
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
    }
  }

  function clearSession(): void {
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
      return await $fetch<T>(url, { ...options, headers: { ...getHeaders(), ...(options.headers ?? {}) } })
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number })?.status
        ?? (err as { status?: number; statusCode?: number })?.statusCode
      if (status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) throw err
        return $fetch<T>(url, { ...options, headers: { ...getHeaders(), ...(options.headers ?? {}) } })
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
      },
    })
    setSession(data)
    useModules().invalidate()
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
      },
    })
    if ('requiresTwoFactor' in data) return data
    setSession(data)
    useModules().invalidate()
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
