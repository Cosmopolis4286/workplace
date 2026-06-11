<template>
  <AuthLayout
    title="Bienvenido de vuelta"
    description="Ingresa tus credenciales para acceder a tu panel"
  >
    <!-- Header action: link to register -->
    <template #header-action>
      <p class="text-sm text-gray-500">
        ¿Sin cuenta?
        <NuxtLink to="/register" class="font-semibold text-workplace-red hover:underline ml-1">
          Regístrate
        </NuxtLink>
      </p>
    </template>

    <form @submit.prevent="handleLogin" class="space-y-5" novalidate>
      <!-- General error banner -->
      <div
        v-if="generalError"
        class="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
        role="alert"
      >
        <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
        <span>{{ generalError }}</span>
      </div>

      <AuthInput
        id="email"
        v-model="form.email"
        type="email"
        label="Correo electrónico"
        placeholder="tu@email.com"
        :icon="EnvelopeIcon"
        :error="errors.email"
        :show-valid="touched.email"
        autocomplete="email"
        required
        @blur="touch('email')"
      />

      <div class="space-y-1.5">
        <AuthInput
          id="password"
          v-model="form.password"
          type="password"
          label="Contraseña"
          placeholder="••••••••"
          :icon="LockClosedIcon"
          :error="errors.password"
          :show-password-toggle="true"
          autocomplete="current-password"
          required
          @blur="touch('password')"
        />
        <div class="flex justify-end">
          <NuxtLink
            to="/recover-password"
            class="text-xs font-semibold text-workplace-red hover:text-red-700 hover:underline transition-colors duration-150"
          >
            ¿Olvidaste tu contraseña?
          </NuxtLink>
        </div>
      </div>

      <!-- Remember me -->
      <label class="flex items-center gap-2.5 cursor-pointer group">
        <div class="relative flex-shrink-0">
          <input
            id="remember-me"
            v-model="form.rememberMe"
            type="checkbox"
            class="sr-only"
          />
          <div
            class="w-4 h-4 rounded border-2 transition-all duration-150 flex items-center justify-center"
            :class="form.rememberMe
              ? 'bg-workplace-red border-workplace-red'
              : 'border-gray-300 group-hover:border-gray-400'"
          >
            <CheckIcon v-if="form.rememberMe" class="w-2.5 h-2.5 text-white stroke-[3]" />
          </div>
        </div>
        <span class="text-sm text-gray-600 select-none">Mantener sesión iniciada</span>
      </label>

      <AuthButton
        type="submit"
        text="Iniciar sesión"
        :loading="isLoading"
        :icon="ArrowLeftEndOnRectangleIcon"
        variant="primary"
      />

      <!-- Divider -->
      <div class="relative flex items-center">
        <div class="flex-1 border-t border-gray-200"></div>
        <span class="px-3 text-xs text-gray-400 font-medium">o continúa con</span>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>

      <!-- Google OAuth -->
      <button
        type="button"
        @click="loginWithGoogle"
        class="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150 shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
      >
        <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continuar con Google
      </button>

      <!-- reCAPTCHA notice -->
      <p v-if="recaptchaEnabled" class="text-center text-[11px] text-gray-400 leading-relaxed">
        Protegido por reCAPTCHA —
        <a href="https://policies.google.com/privacy" target="_blank" class="hover:underline">Privacidad</a>
        y
        <a href="https://policies.google.com/terms" target="_blank" class="hover:underline">Términos</a>
        de Google.
      </p>
    </form>

    <template #footer>
      <p class="text-sm text-gray-500">
        ¿No tienes una cuenta?
        <NuxtLink to="/register" class="font-semibold text-workplace-red hover:underline ml-1 transition-colors duration-150">
          Créala gratis
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>

  <!-- Dev: demo credentials -->
  <AuthDemoCredentials
    :auto-login="true"
    @auto-login="autoLoginDemo"
    @fill-credentials="fillDemoCredentials"
  />
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import { ref, reactive } from 'vue'
import {
  EnvelopeIcon,
  LockClosedIcon,
  ArrowLeftEndOnRectangleIcon,
  ExclamationCircleIcon,
  CheckIcon
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useFormValidation } from '~/composables/useFormValidation'
import { useRecaptcha } from '~/composables/useRecaptcha'
import { getApiErrorMessage } from '~/composables/useApiErrors'

const { login } = useAuth()
const { required, email, minLength, validateAll } = useFormValidation()
const { executeRecaptcha, isEnabled: recaptchaEnabled } = useRecaptcha()
const config = useRuntimeConfig()

const form = reactive({ email: '', password: '', rememberMe: false })
const errors = reactive({ email: '', password: '' })
const touched = reactive({ email: false, password: false })
const isLoading = ref(false)
const generalError = ref('')

const touch = (field: keyof typeof touched) => {
  touched[field] = true
  runValidation()
}

const runValidation = () => {
  const { errors: e } = validateAll(
    { email: form.email, password: form.password },
    {
      email: [required('El correo'), email()],
      password: [required('La contraseña'), minLength(6)]
    }
  )
  errors.email = touched.email ? e.email : ''
  errors.password = touched.password ? e.password : ''
  return !e.email && !e.password
}

const handleLogin = async () => {
  touched.email = true
  touched.password = true
  if (!runValidation()) return

  isLoading.value = true
  generalError.value = ''

  try {
    const recaptchaToken = await executeRecaptcha('login')
    await login({ ...form, recaptchaToken })
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    generalError.value = getApiErrorMessage(err, 'Credenciales incorrectas')
  } finally {
    isLoading.value = false
  }
}

const loginWithGoogle = () => {
  window.location.href = `${config.public.apiUrl}/auth/google`
}

const fillDemoCredentials = (creds: { email: string; password: string }) => {
  form.email = creds.email
  form.password = creds.password
}

const autoLoginDemo = async (creds: { email: string; password: string }) => {
  isLoading.value = true
  try {
    await login(creds)
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    fillDemoCredentials(creds)
    generalError.value = getApiErrorMessage(err, 'Error en demo login')
  } finally {
    isLoading.value = false
  }
}
</script>
