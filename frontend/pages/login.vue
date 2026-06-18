<template>
  <AuthLayout
    :title="t('auth.login.title')"
    :description="t('auth.login.description')"
  >
    <!-- Header action: link to register -->
    <template #header-action>
      <p class="text-sm text-gray-500">
        {{ t('auth.login.noAccount') }}
        <NuxtLink to="/register" class="font-semibold text-workplace-red hover:underline ml-1">
          {{ t('auth.login.register') }}
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
        <span>{{ t('auth.login.rateLimited', { seconds: rateLimitSeconds }) }}</span>
      </div>

      <AuthInput
        id="email"
        v-model="form.email"
        type="email"
        :label="t('auth.login.emailLabel')"
        :placeholder="t('auth.login.emailPlaceholder')"
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
          :label="t('auth.login.passwordLabel')"
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
            {{ t('auth.login.forgotPassword') }}
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
        <span class="text-sm text-gray-600 select-none">{{ t('auth.login.rememberMe') }}</span>
      </label>

      <AuthButton
        type="submit"
        :text="t('auth.login.submit')"
        :loading="isLoading"
        :disabled="rateLimitSeconds > 0"
        :icon="ArrowLeftEndOnRectangleIcon"
        variant="primary"
      />

      <!-- Divider -->
      <div class="relative flex items-center">
        <div class="flex-1 border-t border-gray-200"></div>
        <span class="px-3 text-xs text-gray-400 font-medium">{{ t('auth.login.orContinueWith') }}</span>
        <div class="flex-1 border-t border-gray-200"></div>
      </div>

      <!-- Google OAuth -->
      <AuthGoogleAuthButton />

      <!-- reCAPTCHA notice -->
      <i18n-t v-if="recaptchaEnabled" keypath="auth.login.recaptchaNotice" tag="p" class="text-center text-[11px] text-gray-400 leading-relaxed">
        <template #privacy>
          <a href="https://policies.google.com/privacy" target="_blank" class="hover:underline">{{ t('auth.login.privacy') }}</a>
        </template>
        <template #terms>
          <a href="https://policies.google.com/terms" target="_blank" class="hover:underline">{{ t('auth.login.terms') }}</a>
        </template>
      </i18n-t>
    </form>

    <template #footer>
      <p class="text-sm text-gray-500">
        {{ t('auth.login.noAccountFooter') }}
        <NuxtLink to="/register" class="font-semibold text-workplace-red hover:underline ml-1 transition-colors duration-150">
          {{ t('auth.login.createFree') }}
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
  CheckIcon,
  ClockIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useFormValidation } from '~/composables/useFormValidation'
import { useRecaptcha } from '~/composables/useRecaptcha'
import { getApiErrorMessage, getRateLimitSeconds } from '~/composables/useApiErrors'
import { useToast } from '~/composables/useToast'

const { t } = useI18n()
useHead({ title: () => `${t('auth.login.title')} — ${t('common.appName')}` })

const { login, isAuthenticated } = useAuth()
const { required, email, minLength, validateAll } = useFormValidation()
const { executeRecaptcha, isEnabled: recaptchaEnabled } = useRecaptcha()
const toast = useToast()
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
      email: [required(t('validation.fields.email')), email()],
      password: [required(t('validation.fields.password')), minLength(6)]
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

  try {
    const recaptchaToken = await executeRecaptcha('login')
    const result = await login({ ...form, recaptchaToken })
    if ('requiresTwoFactor' in result) {
      await navigateTo(`/auth/2fa-verify?sessionId=${encodeURIComponent(result.sessionId)}`)
      return
    }
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    const seconds = getRateLimitSeconds(err)
    if (seconds !== null) {
      startRateLimitCountdown(seconds)
    } else {
      toast.error(getApiErrorMessage(err, t('auth.login.invalidCredentials')))
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
    toast.error(getApiErrorMessage(err, t('auth.login.demoLoginError')))
  } finally {
    isLoading.value = false
  }
}
</script>
