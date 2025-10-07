import { ref, computed } from 'vue'

const currentUser = ref({
  id: 1,
  name: 'Juan Pérez',
  email: 'juan@restaurant.com',
  role: 'admin',
  restaurant: {
    id: 1,
    name: 'Restaurante El Sabor',
    type: 'Comida Mexicana',
    address: 'Av. Principal 123',
    phone: '+52 55 1234 5678'
  },
  avatar: 'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
})

export const useAuth = () => {
  const user = computed(() => currentUser.value)
  const isAuthenticated = computed(() => !!currentUser.value)
  const restaurant = computed(() => currentUser.value?.restaurant)

  const login = (credentials) => {
    // Simulación de login
    return Promise.resolve(currentUser.value)
  }

  const logout = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        currentUser.value = null
        resolve()
      }, 500)
    })
  }

  const updateProfile = (data) => {
    currentUser.value = { ...currentUser.value, ...data }
  }

  return {
    user,
    isAuthenticated,
    restaurant,
    login,
    logout,
    updateProfile
  }
}