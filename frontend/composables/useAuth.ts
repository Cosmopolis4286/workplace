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
  firstName: string
  lastName: string
  phone?: string
  role: 'ADMIN' | 'MANAGER' | 'STAFF'
  isActive: boolean
  restaurant?: Restaurant
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
  restaurantName: string
  password: string
}

interface LoginCredentials {
  email: string
  password: string
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
  const restaurant = computed(() => currentUser.value?.restaurant)
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
        restaurantName: credentials.restaurantName,
        password: credentials.password,
      },
    })
    setSession(data)
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

  function updateProfile(data: Partial<User>): void {
    if (!currentUser.value) return
    currentUser.value = { ...currentUser.value, ...data }
    if (process.client) {
      localStorage.setItem('auth_user', JSON.stringify(currentUser.value))
    }
  }

  return {
    user,
    isAuthenticated,
    restaurant,
    token,
    login,
    register,
    logout,
    updateProfile,
    fetchProfile,
    refreshAccessToken,
    getHeaders,
  }
}
