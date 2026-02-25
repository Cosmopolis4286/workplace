import { ref, computed } from 'vue'

const currentUser = ref(null)
const accessToken = ref(null)
const refreshToken = ref(null)

// Rehydrate from localStorage on client
if (process.client) {
  const storedUser = localStorage.getItem('auth_user')
  const storedAccess = localStorage.getItem('auth_access_token')
  const storedRefresh = localStorage.getItem('auth_refresh_token')
  if (storedUser && storedAccess) {
    currentUser.value = JSON.parse(storedUser)
    accessToken.value = storedAccess
    refreshToken.value = storedRefresh
  }
}

export const useAuth = () => {
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl

  const user = computed(() => currentUser.value)
  const isAuthenticated = computed(() => !!currentUser.value && !!accessToken.value)
  const restaurant = computed(() => currentUser.value?.restaurant)
  const token = computed(() => accessToken.value)

  // --- Helpers ---
  const setSession = (data) => {
    currentUser.value = data.user
    accessToken.value = data.accessToken
    refreshToken.value = data.refreshToken

    if (process.client) {
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      localStorage.setItem('auth_access_token', data.accessToken)
      localStorage.setItem('auth_refresh_token', data.refreshToken)
    }
  }

  const clearSession = () => {
    currentUser.value = null
    accessToken.value = null
    refreshToken.value = null

    if (process.client) {
      localStorage.removeItem('auth_user')
      localStorage.removeItem('auth_access_token')
      localStorage.removeItem('auth_refresh_token')
    }
  }

  // --- API actions ---
  const register = async (credentials) => {
    const data = await $fetch(`${apiUrl}/api/auth/register`, {
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

  const login = async (credentials) => {
    const data = await $fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password,
      },
    })
    setSession(data)
    return data.user
  }

  const logout = async () => {
    try {
      if (accessToken.value) {
        await $fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken.value}` },
        })
      }
    } catch {
      // Logout locally even if request fails
    } finally {
      clearSession()
    }
  }

  const refreshAccessToken = async () => {
    if (!refreshToken.value) return false
    try {
      const data = await $fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        body: { refreshToken: refreshToken.value },
      })
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

  const fetchProfile = async () => {
    if (!accessToken.value) return null
    try {
      const user = await $fetch(`${apiUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      })
      currentUser.value = user
      if (process.client) localStorage.setItem('auth_user', JSON.stringify(user))
      return user
    } catch (err) {
      if (err.statusCode === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) clearSession()
      }
      return null
    }
  }

  const updateProfile = (data) => {
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
  }
}
