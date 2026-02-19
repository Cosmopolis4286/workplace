<template>
  <AuthLayout
    title="Crear Cuenta"
    description="Únete a iFood Manager"
  >
    <form @submit.prevent="handleRegister" class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AuthInput
          id="firstName"
          v-model="form.firstName"
          type="text"
          label="Nombre"
          placeholder="Juan"
          :icon="UserIcon"
          :error="errors.firstName"
          required
        />

        <AuthInput
          id="lastName"
          v-model="form.lastName"
          type="text"
          label="Apellido"
          placeholder="Pérez"
          :icon="UserIcon"
          :error="errors.lastName"
          required
        />
      </div>

      <AuthInput
        id="email"
        v-model="form.email"
        type="email"
        label="Correo Electrónico"
        placeholder="tu@email.com"
        :icon="EnvelopeIcon"
        :error="errors.email"
        required
      />

      <AuthInput
        id="phone"
        v-model="form.phone"
        type="tel"
        label="Teléfono"
        placeholder="+52 55 1234 5678"
        :icon="PhoneIcon"
        :error="errors.phone"
        required
      />

      <AuthInput
        id="restaurantName"
        v-model="form.restaurantName"
        type="text"
        label="Nombre del Restaurante"
        placeholder="Mi Restaurante"
        :icon="BuildingStorefrontIcon"
        :error="errors.restaurantName"
        required
      />

      <AuthInput
        id="password"
        v-model="form.password"
        type="password"
        label="Contraseña"
        placeholder="••••••••"
        :icon="LockClosedIcon"
        :error="errors.password"
        :show-password-toggle="true"
        hint="Mínimo 8 caracteres, incluye mayúsculas, minúsculas y números"
        required
      />

      <AuthInput
        id="confirmPassword"
        v-model="form.confirmPassword"
        type="password"
        label="Confirmar Contraseña"
        placeholder="••••••••"
        :icon="LockClosedIcon"
        :error="errors.confirmPassword"
        :show-password-toggle="true"
        required
      />

      <div class="space-y-4">
        <div class="flex items-start">
          <input
            id="terms"
            v-model="form.acceptTerms"
            type="checkbox"
            class="h-4 w-4 text-ifood-red focus:ring-ifood-red border-gray-300 rounded mt-1 transition-colors duration-200"
          >
          <label for="terms" class="ml-3 block text-sm text-gray-700">
            Acepto los 
            <a href="#" class="font-semibold text-ifood-red hover:text-red-700 transition-colors duration-200 hover:underline">
              Términos y Condiciones
            </a>
            y la
            <a href="#" class="font-semibold text-ifood-red hover:text-red-700 transition-colors duration-200 hover:underline ml-1">
              Política de Privacidad
            </a>
          </label>
        </div>

        <div class="flex items-start">
          <input
            id="newsletter"
            v-model="form.acceptNewsletter"
            type="checkbox"
            class="h-4 w-4 text-ifood-red focus:ring-ifood-red border-gray-300 rounded mt-1 transition-colors duration-200"
          >
          <label for="newsletter" class="ml-3 block text-sm text-gray-700">
            Quiero recibir noticias y actualizaciones por correo electrónico
          </label>
        </div>
      </div>

      <AuthButton
        type="submit"
        text="Crear Cuenta"
        :loading="isLoading"
        :icon="UserPlusIcon"
        :disabled="!form.acceptTerms"
      />

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-4 bg-white text-gray-500 font-medium">O regístrate con</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <AuthButton
          variant="outline"
          text="Google"
          @click="registerWithGoogle"
        />
        <AuthButton
          variant="outline"
          text="Facebook"
          @click="registerWithFacebook"
        />
      </div>
    </form>

    <template #footer>
      <p class="text-sm text-gray-600">
        ¿Ya tienes una cuenta?
        <NuxtLink
          to="/login"
          class="font-semibold text-ifood-red hover:text-red-700 transition-colors duration-200 hover:underline ml-1"
        >
          Inicia sesión aquí
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { 
  UserIcon,
  EnvelopeIcon, 
  PhoneIcon,
  BuildingStorefrontIcon,
  LockClosedIcon,
  UserPlusIcon
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
const { login } = useAuth()

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  restaurantName: '',
  password: '',
  confirmPassword: '',
  acceptTerms: false,
  acceptNewsletter: false
})

const errors = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  restaurantName: '',
  password: '',
  confirmPassword: ''
})

const isLoading = ref(false)

const validateForm = () => {
  // Reset errors
  Object.keys(errors).forEach(key => errors[key] = '')

  let isValid = true

  if (!form.firstName) {
    errors.firstName = 'El nombre es requerido'
    isValid = false
  }

  if (!form.lastName) {
    errors.lastName = 'El apellido es requerido'
    isValid = false
  }

  if (!form.email) {
    errors.email = 'El correo electrónico es requerido'
    isValid = false
  } else if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'El correo electrónico no es válido'
    isValid = false
  }

  if (!form.phone) {
    errors.phone = 'El teléfono es requerido'
    isValid = false
  }

  if (!form.restaurantName) {
    errors.restaurantName = 'El nombre del restaurante es requerido'
    isValid = false
  }

  if (!form.password) {
    errors.password = 'La contraseña es requerida'
    isValid = false
  } else if (form.password.length < 8) {
    errors.password = 'La contraseña debe tener al menos 8 caracteres'
    isValid = false
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
    errors.password = 'La contraseña debe incluir mayúsculas, minúsculas y números'
    isValid = false
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirma tu contraseña'
    isValid = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Las contraseñas no coinciden'
    isValid = false
  }

  return isValid
}

const handleRegister = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    // Simulate registration API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Auto-login after registration
    await login({ email: form.email, password: form.password })
    
    // Redirect to dashboard
    await navigateTo('/')
  } catch (error) {
    console.error('Register error:', error)
  } finally {
    isLoading.value = false
  }
}

const registerWithGoogle = () => {
  console.log('Register with Google')
}

const registerWithFacebook = () => {
  console.log('Register with Facebook')
}
</script>