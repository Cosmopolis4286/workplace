import { ref, computed } from 'vue'

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
  commerce?: Restaurant
  categoryId?: string
}

interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

interface RegisterCredentials {
  firstName: string
  lastName: string
  email: string
  phone?: string
  commerceName: string
  password: string
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
}

interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

// Estado global reactivo compartido entre todas las instancias
const currentUser = ref<User | null>(null)
const accessToken = ref<string | null>(null)
const refreshToken = ref<string | null>(null)
const initialized = ref(false)

function rehydrate(): void {
  if (initialized.value || !process.client) return
  initialized.value = true
  try {
    const storedUser = localStorage.getItem('auth_user')
    const storedAccess = localStorage.getItem('auth_access_token')
    const storedRefresh = localStorage.getItem('auth_refresh_token')
    if (storedUser && storedAccess) {
      currentUser.value = JSON.parse(storedUser) as User
      accessToken.value = storedAccess
      refreshToken.value = storedRefresh
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

  const user = computed(() => currentUser.value)
  const isAuthenticated = computed(() => !!currentUser.value && !!accessToken.value)
  const restaurant = computed(() => currentUser.value?.commerce)
  const token = computed(() => accessToken.value)

  function setSession(data: AuthResponse): void {
    currentUser.value = data.user
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken
    if (process.client) {
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      localStorage.setItem('auth_access_token', data.accessToken)
      localStorage.setItem('auth_refresh_token', data.refreshToken)
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
    const data = await $fetch<AuthResponse>(`${apiUrl}/api/auth/register`, {
      method: 'POST',
      body: {
        firstName: credentials.firstName,
        lastName: credentials.lastName,
        email: credentials.email,
        phone: credentials.phone || undefined,
        commerceName: credentials.commerceName,
        password: credentials.password,
      },
    })
    setSession(data)
    usePermissions().fetchPermissions().catch(() => {})
    return data.user
  }

  async function login(credentials: LoginCredentials): Promise<User> {
    const data = await $fetch<AuthResponse>(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
      },
    })
    setSession(data)
    usePermissions().fetchPermissions().catch(() => {})
    return data.user
  }

  async function logout(): Promise<void> {
    try {
      if (accessToken.value) {
        await $fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: getHeaders(),
        })
      }
    } catch {
      // Limpiar sesión aunque falle la petición
    } finally {
      clearSession()
      usePermissions().clearPermissions()
    }
  }

  async function refreshAccessToken(): Promise<boolean> {
    if (!refreshToken.value) return false
    try {
      const data = await $fetch<Pick<AuthResponse, 'accessToken' | 'refreshToken'>>(
        `${apiUrl}/api/auth/refresh`,
        {
          method: 'POST',
          body: { refreshToken: refreshToken.value },
        },
      )
      accessToken.value = data.accessToken
      refreshToken.value = data.refreshToken
      if (process.client) {
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
    if (!accessToken.value) return null
    try {
      const profile = await $fetch<User>(`${apiUrl}/api/auth/me`, {
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
    const updated = await $fetch<User>(`${apiUrl}/api/auth/me`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: payload,
    })
    currentUser.value = updated
    if (process.client) localStorage.setItem('auth_user', JSON.stringify(updated))
    return updated
  }

  async function changePassword(payload: ChangePasswordPayload): Promise<void> {
    await $fetch(`${apiUrl}/api/auth/change-password`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: payload,
    })
  }

  async function checkUsername(username: string): Promise<{ available: boolean; canChange: boolean; daysLeft: number; nextChangeAt: string | null }> {
    return $fetch<{ available: boolean; canChange: boolean; daysLeft: number; nextChangeAt: string | null }>(
      `${apiUrl}/api/auth/check-username?username=${encodeURIComponent(username)}`,
      { headers: getHeaders() },
    )
  }

  async function uploadAvatar(file: File): Promise<User> {
    const formData = new FormData()
    formData.append('avatar', file)
    const updated = await $fetch<User>(`${apiUrl}/api/auth/me/avatar`, {
      method: 'POST',
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
    uploadAvatar,
    fetchProfile,
    refreshAccessToken,
    getHeaders,
    checkUsername,
  }
}
