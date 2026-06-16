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
      <!-- Rate-limit countdown banner -->
      <div
        v-if="rateLimitSeconds > 0"
        class="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800"
        role="alert"
      >
        <ClockIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
        <span>Demasiados intentos. Espera <strong>{{ rateLimitSeconds }}s</strong> antes de reintentar.</span>
      </div>

      <!-- General error banner -->
      <div
        v-if="generalError && rateLimitSeconds === 0"
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
        :disabled="rateLimitSeconds > 0"
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
      <GoogleAuthButton />

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
useHead({ title: 'Iniciar sesión — WorkPlace Manager' })

import { ref, reactive } from 'vue'
import {
  EnvelopeIcon,
  LockClosedIcon,
  ArrowLeftEndOnRectangleIcon,
  ExclamationCircleIcon,
  CheckIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useFormValidation } from '~/composables/useFormValidation'
import { useRecaptcha } from '~/composables/useRecaptcha'
import { getApiErrorMessage } from '~/composables/useApiErrors'

const { login, isAuthenticated } = useAuth()
const { required, email, minLength, validateAll } = useFormValidation()
const { executeRecaptcha, isEnabled: recaptchaEnabled } = useRecaptcha()
const config = useRuntimeConfig()
const route = useRoute()

// F: auto-redirect si ya hay sesión activa
onMounted(() => {
  if (isAuthenticated.value) navigateTo('/dashboard')
  // G: pre-rellenar email desde query param (?email= viene de register/recover-password)
  const emailParam = route.query.email as string | undefined
  if (emailParam) form.email = decodeURIComponent(emailParam)
})

const form = reactive({ email: '', password: '', rememberMe: false })
const errors = reactive({ email: '', password: '' })
const touched = reactive({ email: false, password: false })
const isLoading = ref(false)
const generalError = ref('')

// E: rate-limit countdown
const rateLimitSeconds = ref(0)
let rateLimitTimer: ReturnType<typeof setInterval> | null = null

function startRateLimitCountdown(seconds: number) {
  rateLimitSeconds.value = seconds
  if (rateLimitTimer) clearInterval(rateLimitTimer)
  rateLimitTimer = setInterval(() => {
    rateLimitSeconds.value--
    if (rateLimitSeconds.value <= 0) {
      clearInterval(rateLimitTimer!)
      rateLimitTimer = null
    }
  }, 1000)
}
onUnmounted(() => { if (rateLimitTimer) clearInterval(rateLimitTimer) })

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
    const result = await login({ ...form, recaptchaToken })
    if ('requiresTwoFactor' in result) {
      await navigateTo(`/auth/2fa-verify?sessionId=${encodeURIComponent(result.sessionId)}`)
      return
    }
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    const msg = getApiErrorMessage(err, 'Credenciales incorrectas')
    // Detectar rate-limit con segundos para countdown
    const match = msg.match(/(\d+)\s*segundo/i)
    if (match) {
      startRateLimitCountdown(parseInt(match[1], 10))
    } else {
      generalError.value = msg
    }
  } finally {
    isLoading.value = false
  }
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
