import { useAuth } from '~/composables/useAuth'
import { usePermissions } from '~/composables/usePermissions'

export default defineNuxtRouteMiddleware(async (to: any, from: any) => {
  const auth = useAuth()
  const permissions = usePermissions()

  // Si no está autenticado, redirigir a login
  if (!auth.isAuthenticated.value) {
    return navigateTo('/login')
  }

  // Esperar a que se carguen los permisos y categorías
  if (!permissions.initialized.value) {
    try {
      await permissions.fetchPermissions()
    } catch (error) {
      console.error('Error loading permissions:', error)
      return navigateTo('/login')
    }
  }

  const userCategory = permissions.userCategory.value
  const userRole = auth.user.value?.role

  // Validar si el usuario tiene una sección activa según su categoría
  const hasActiveSection = await validateUserSection(userCategory, userRole, auth.user.value?.id)

  if (!hasActiveSection) {
    // Redirigir a una página de configuración o onboarding según el rol
    if (userRole === 'COMMERCE' && userCategory === 'Comida') {
      // Usuario de comida necesita restaurante
      return navigateTo('/onboarding?step=restaurant')
    } else if (userRole === 'FREELANCER') {
      // Freelancer necesita configurar sus servicios
      return navigateTo('/onboarding?step=services')
    } else {
      // Para otros roles, redirigir a una página genérica de configuración
      return navigateTo('/onboarding')
    }
  }
})

async function validateUserSection(category: string | null, role: string | null, userId: string | undefined): Promise<boolean> {
  // Admins y superadmins siempre tienen acceso
  if (role === 'SUPERADMIN' || role === 'ADMIN') {
    return true
  }

  // Usuarios normales tienen acceso a su dashboard personalizado
  if (role === 'NORMAL') {
    return true
  }

  // Si no hay categoría, no puede acceder
  if (!category || !userId) {
    return false
  }

  try {
    const config = useRuntimeConfig()
    const apiUrl = config.public.apiUrl as string

    // Validar según la categoría
    if (category === 'Comida') {
      // Verificar si tiene restaurante asociado
      const response = await $fetch(`${apiUrl}/restaurants/by-user/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })
      return !!response
    } else if (['Tecnología', 'Diseño', 'Transporte', 'Belleza', 'Educación', 'Salud', 'Consultoría', 'Marketing'].includes(category)) {
      // Para otras categorías, verificar si tiene configuración básica
      const response = await $fetch(`${apiUrl}/users/${userId}/profile-completion`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      })
      return response?.isComplete || false
    }

    return false
  } catch (error) {
    console.error('Error validating user section:', error)
    return false
  }
}
