import { defineStore } from 'pinia'

interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface LoginCredentials {
  email: string
  password: string
}

interface LoginResponse {
  success: boolean
  error?: string
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false
  }),

  getters: {
    currentUser: (state: AuthState): User | null => state.user,
    isLoggedIn: (state: AuthState): boolean => state.isAuthenticated && !!state.token
  },

  actions: {
    async login(credentials: LoginCredentials): Promise<LoginResponse> {
      this.isLoading = true
      try {
        // Lógica de login aquí
        // const response = await $fetch('/api/auth/login', {
        //   method: 'POST',
        //   body: credentials
        // })
        
        // Temporal - mock
        this.user = { id: '1', email: credentials.email, name: 'User' }
        this.token = 'mock-token'
        this.isAuthenticated = true
        
        return { success: true }
      } catch (error: any) {
        return { success: false, error: error.message }
      } finally {
        this.isLoading = false
      }
    },

    logout(): void {
      this.user = null
      this.token = null
      this.isAuthenticated = false
      
      // Limpiar localStorage si se usa
      if (process.client) {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      }
    },

    setAuth(user: User, token: string): void {
      this.user = user
      this.token = token
      this.isAuthenticated = true
      
      if (process.client) {
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user_data', JSON.stringify(user))
      }
    },

    clearAuth(): void {
      this.logout()
    }
  }
})
