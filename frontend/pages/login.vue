<template>
  <AuthLayout
    title="Iniciar Sesión"
    description="Accede a tu panel de control"
  >
    <form @submit.prevent="handleLogin" class="space-y-6">
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
        id="password"
        v-model="form.password"
        type="password"
        label="Contraseña"
        placeholder="••••••••"
        :icon="LockClosedIcon"
        :error="errors.password"
        :show-password-toggle="true"
        required
      />

      <div class="flex items-center justify-between">
        <div class="flex items-center">
          <input
            id="remember-me"
            v-model="form.rememberMe"
            type="checkbox"
            class="h-4 w-4 text-ifood-red focus:ring-ifood-red border-gray-300 rounded transition-colors duration-200"
          >
          <label for="remember-me" class="ml-2 block text-sm text-gray-700 font-medium">
            Recordarme
          </label>
        </div>

        <NuxtLink
          to="/recover-password"
          class="text-sm font-semibold text-ifood-red hover:text-red-700 transition-colors duration-200 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </NuxtLink>
      </div>

      <AuthButton
        type="submit"
        text="Iniciar Sesión"
        :loading="isLoading"
        :icon="ArrowRightOnRectangleIcon"
      />

      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-gray-300"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-4 bg-white text-gray-500 font-medium">O continúa con</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <AuthButton
          variant="outline"
          text="Google"
          @click="loginWithGoogle"
        />
        <AuthButton
          variant="outline"
          text="Facebook"
          @click="loginWithFacebook"
        />
      </div>
    </form>

    <template #footer>
      <p class="text-sm text-gray-600">
        ¿No tienes una cuenta?
        <NuxtLink
          to="/register"
          class="font-semibold text-ifood-red hover:text-red-700 transition-colors duration-200 hover:underline ml-1"
        >
          Regístrate aquí
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>

  <AuthDemoCredentials @fill-credentials="fillDemoCredentials" />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })
import { ref, reactive } from 'vue'
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  ArrowRightOnRectangleIcon 
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
const { login } = useAuth()

const form = reactive({
  email: '',
  password: '',
  rememberMe: false
})

const errors = reactive({
  email: '',
  password: ''
})

const isLoading = ref(false)

const validateForm = () => {
  errors.email = ''
  errors.password = ''

  if (!form.email) {
    errors.email = 'El correo electrónico es requerido'
    return false
  }

  if (!/\S+@\S+\.\S+/.test(form.email)) {
    errors.email = 'El correo electrónico no es válido'
    return false
  }

  if (!form.password) {
    errors.password = 'La contraseña es requerida'
    return false
  }

  if (form.password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres'
    return false
  }

  return true
}

const handleLogin = async () => {
  if (!validateForm()) return

  isLoading.value = true

  try {
    await login(form)
    await navigateTo('/')
  } catch (error) {
    const msg = error?.data?.message || error?.message || 'Credenciales incorrectas'
    if (msg.toLowerCase().includes('intentos')) {
      errors.password = msg
    } else {
      errors.email = msg
    }
  } finally {
    isLoading.value = false
  }
}

const loginWithGoogle = () => {
  console.log('Login with Google')
}

const loginWithFacebook = () => {
  console.log('Login with Facebook')
}

const fillDemoCredentials = (creds: { email: string; password: string }) => {
  form.email = creds.email
  form.password = creds.password
}
</script>