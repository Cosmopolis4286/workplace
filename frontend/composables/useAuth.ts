import { ref, computed } from 'vue'
import { Capacitor } from '@capacitor/core'

interface Restaurant {
  id: string
  name: string
  type?: string
  address?: string
  phone?: string
}

interface User {
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
  commerce?: Restaurant
  categoryId?: string
  category?: { id: string; name: string; icon?: string | null } | null
  country?: string
  state?: string
  city?: string
  twoFactorEnabled?: boolean
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
  phone?: string
  commerceName: string
  password: string
  acceptTerms: boolean
}

interface LoginCredentials {
  email: string
  password: string
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
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string

  rehydrate()

  const isNative = process.client ? Capacitor.isNativePlatform() : false

  const user = computed(() => currentUser.value)
  const isAuthenticated = computed(() => !!currentUser.value)
  const restaurant = computed(() => currentUser.value?.commerce)
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

  async function register(credentials: RegisterCredentials): Promise<User> {
    const data = await $fetch<AuthResponse>(`${apiUrl}/auth/register`, {
      method: 'POST',
      credentials: 'include',
      body: {
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        email: credentials.email,
        phone: credentials.phone || undefined,
        commerceName: credentials.commerceName,
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
    return $fetch(`${apiUrl}/auth/2fa/setup`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
    })
  }

  async function enableTwoFactor(code: string): Promise<{ enabled: true; backupCodes: string[] }> {
    return $fetch(`${apiUrl}/auth/2fa/enable`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: { code },
    })
  }

  async function disableTwoFactor(password: string, code: string): Promise<{ enabled: false }> {
    const result = await $fetch<{ enabled: false }>(`${apiUrl}/auth/2fa/disable`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: { password, code },
    })
    if (currentUser.value) updateLocalUser({ twoFactorEnabled: false } as Partial<User>)
    return result
  }

  async function logout(): Promise<void> {
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
      const profile = await $fetch<User>(`${apiUrl}/auth/me`, {
        credentials: 'include',
        headers: getHeaders(),
      })
      currentUser.value = profile
      if (process.client) localStorage.setItem('auth_user', JSON.stringify(profile))
      return profile
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number })?.status
        ?? (err as { status?: number; statusCode?: number })?.statusCode
      if (status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) return null
        return fetchProfile()
      }
      return null
    }
  }

  function updateLocalUser(data: Partial<User>): void {
    if (!currentUser.value) return
    currentUser.value = { ...currentUser.value, ...data }
    if (process.client) {
      localStorage.setItem('auth_user', JSON.stringify(currentUser.value))
    }
  }

  async function saveProfile(payload: UpdateProfilePayload): Promise<User> {
    const updated = await $fetch<User>(`${apiUrl}/auth/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getHeaders(),
      body: payload,
    })
    currentUser.value = updated
    if (process.client) localStorage.setItem('auth_user', JSON.stringify(updated))
    return updated
  }

  async function changePassword(payload: ChangePasswordPayload): Promise<void> {
    await $fetch(`${apiUrl}/auth/change-password`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getHeaders(),
      body: payload,
    })
  }

  async function checkUsername(username: string): Promise<{ available: boolean; canChange: boolean; daysLeft: number; nextChangeAt: string | null }> {
    return $fetch<{ available: boolean; canChange: boolean; daysLeft: number; nextChangeAt: string | null }>(
      `${apiUrl}/auth/check-username?username=${encodeURIComponent(username)}`,
      { credentials: 'include', headers: getHeaders() },
    )
  }

  async function getSessions(): Promise<Session[]> {
    return $fetch<Session[]>(`${apiUrl}/auth/sessions`, {
      credentials: 'include',
      headers: getHeaders(),
    })
  }

  async function revokeSession(id: string): Promise<void> {
    await $fetch(`${apiUrl}/auth/sessions/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    })
  }

  async function revokeAllSessions(): Promise<void> {
    await $fetch(`${apiUrl}/auth/sessions`, {
      method: 'DELETE',
      credentials: 'include',
      headers: getHeaders(),
    })
  }

  async function uploadAvatar(file: File): Promise<User> {
    const formData = new FormData()
    formData.append('avatar', file)
    const updated = await $fetch<User>(`${apiUrl}/auth/me/avatar`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(),
      body: formData,
    })
    currentUser.value = updated
    if (process.client) localStorage.setItem('auth_user', JSON.stringify(updated))
    return updated
  }

  return {
    user,
    isAuthenticated,
    restaurant,
    token,
    currentUser,
    login,
    register,
    logout,
    setSession,
    updateLocalUser,
    saveProfile,
    changePassword,
    getSessions,
    revokeSession,
    uploadAvatar,
    fetchProfile,
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
