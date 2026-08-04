<template>
  <AuthLayout
    :title="t('auth.verifyEmail.title')"
    :description="t('auth.verifyEmail.description')"
  >
    <div class="flex flex-col items-center text-center gap-5 py-2">
      <!-- Verifying state -->
      <div v-if="isVerifying" class="flex flex-col items-center gap-4 py-8">
        <div class="w-12 h-12 border-4 border-workplace-red border-t-transparent rounded-full animate-spin" />
        <p class="text-sm text-gray-500">{{ t('auth.verifyEmail.verifying') }}</p>
      </div>

      <!-- Error state -->
      <div v-else-if="verificationError" class="flex flex-col items-center gap-4 py-4">
        <div class="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center">
          <ExclamationTriangleIcon class="h-10 w-10 text-red-500" />
        </div>
        <div class="space-y-2 max-w-xs">
          <h3 class="text-lg font-bold text-gray-900">{{ t('auth.verifyEmail.failedTitle') }}</h3>
          <p class="text-sm text-red-600">{{ verificationError }}</p>
        </div>
        <AuthButton
          variant="primary"
          :text="t('auth.verifyEmail.resend')"
          :icon="ArrowPathIcon"
          :loading="isResending"
          @click="resendVerification"
        />
      </div>

      <!-- Success/Resent state -->
      <div v-else-if="resentSuccess" class="flex flex-col items-center gap-4 py-4">
        <div class="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center">
          <CheckIcon class="h-10 w-10 text-green-600" />
        </div>
        <div class="space-y-2 max-w-xs">
          <h3 class="text-lg font-bold text-gray-900">{{ t('auth.verifyEmail.resentTitle') }}</h3>
          <p class="text-sm text-gray-500">{{ t('auth.verifyEmail.resentDesc') }}</p>
        </div>
      </div>

      <!-- Default state -->
      <template v-else>
        <!-- Animated envelope -->
        <div class="relative">
          <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-workplace-red/10 to-red-600/10 flex items-center justify-center border border-red-100">
            <EnvelopeIcon class="h-10 w-10 text-workplace-red" />
          </div>
          <div class="absolute -top-1 -right-1 w-6 h-6 bg-workplace-red rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            <span class="text-white text-xs font-bold">1</span>
          </div>
        </div>

        <div class="space-y-2 max-w-xs">
          <h3 class="text-lg font-bold text-gray-900">{{ t('auth.verifyEmail.almostDoneTitle') }}</h3>
          <p class="text-sm text-gray-500 leading-relaxed">
            {{ t('auth.verifyEmail.sentTo') }}
          </p>
          <p class="text-sm font-semibold text-workplace-red bg-red-50 px-3 py-1.5 rounded-lg inline-block">
            {{ displayEmail }}
          </p>
          <p class="text-sm text-gray-500 leading-relaxed">
            {{ t('auth.verifyEmail.instructions', { appName: t('common.appName') }) }}
          </p>
        </div>

        <!-- Steps -->
        <div class="w-full space-y-3 py-2">
          <div
            v-for="(step, i) in verifySteps"
            :key="i"
            class="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-gray-100"
          >
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              :class="step.done ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'"
            >
              <CheckIcon v-if="step.done" class="w-3.5 h-3.5 stroke-[3]" />
              <span v-else>{{ Number(i) + 1 }}</span>
            </div>
            <div class="text-left">
              <p class="text-sm font-medium text-gray-700">{{ step.label }}</p>
              <p class="text-xs text-gray-400">{{ step.desc }}</p>
            </div>
          </div>
        </div>

        <!-- Info box -->
        <div class="w-full flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
          <ExclamationTriangleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <i18n-t keypath="auth.verifyEmail.expiryNotice" tag="p">
            <template #hours>
              <strong>{{ t('auth.verifyEmail.expiryHours') }}</strong>
            </template>
          </i18n-t>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3 w-full">
          <AuthButton
            variant="primary"
            :text="t('auth.verifyEmail.resend')"
            :icon="ArrowPathIcon"
            :loading="isResending"
            @click="resendVerification"
          />
          <AuthButton
            variant="ghost"
            :text="t('auth.verifyEmail.useAnotherEmail')"
            :icon="ArrowLeftIcon"
            @click="navigateTo('/register')"
          />
        </div>
      </template>
    </div>

    <template #footer>
      <p class="text-sm text-gray-500">
        {{ t('auth.verifyEmail.alreadyVerified') }}
        <NuxtLink to="/login" class="font-semibold text-workplace-red hover:underline ml-1">
          {{ t('auth.verifyEmail.login') }}
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import { ref, computed, onMounted, onUnmounted } from 'vue'
import { EnvelopeIcon, CheckIcon, ArrowPathIcon, ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useApi } from '~/composables/useApi'
import { getApiErrorMessage } from '~/composables/useApiErrors'
import { useToast } from '~/composables/useToast'

const { t } = useI18n()
useHead({ title: () => `${t('auth.verifyEmail.title')} — ${t('common.appName')}` })

const { user, fetchProfile } = useAuth()
const { post } = useApi()
const toast = useToast()
const route = useRoute()

function loginRedirectUrl(): string {
  const redirect = route.query.redirect as string | undefined
  return redirect ? `/login?verified=true&redirect=${encodeURIComponent(redirect)}` : '/login?verified=true'
}

// email puede venir de ?email= cuando se llega desde register
const displayEmail = computed(() => {
  const emailParam = route.query.email as string | undefined
  return emailParam ? decodeURIComponent(emailParam) : (user.value?.email ?? t('auth.verifyEmail.defaultEmail'))
})

// Polling: si el usuario verifica en otra pestaña, detectarlo y redirigir
// Stops after 60 attempts (5 min) to avoid endless background requests
let pollTimer: ReturnType<typeof setInterval> | null = null
let pollAttempts = 0
const MAX_POLL_ATTEMPTS = 60

function startPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollAttempts = 0
  pollTimer = setInterval(async () => {
    pollAttempts++
    if (pollAttempts >= MAX_POLL_ATTEMPTS) {
      clearInterval(pollTimer!)
      return
    }
    const profile = await fetchProfile().catch(() => null)
    if (profile?.emailVerified) {
      clearInterval(pollTimer!)
      await navigateTo(loginRedirectUrl())
    }
  }, 5000)
}
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

const isResending = ref(false)
const resentSuccess = ref(false)

const verifySteps = computed(() => [
  { label: t('auth.verifyEmail.step1'), desc: t('auth.verifyEmail.step1Desc'), done: true },
  { label: t('auth.verifyEmail.step2'), desc: t('auth.verifyEmail.step2Desc'), done: false },
  { label: t('auth.verifyEmail.step3'), desc: t('auth.verifyEmail.step3Desc'), done: false },
])

const resendVerification = async () => {
  isResending.value = true
  try {
    const email = user.value?.email ?? (route.query.email as string | undefined)
    if (user.value) {
      await post('/auth/send-verification', {})
    } else if (email) {
      await post('/auth/send-verification-by-email', { email: decodeURIComponent(email) })
    }
    resentSuccess.value = true
    // Reiniciar polling para detectar verificación tras reenvío
    startPolling()
  } catch (err: unknown) {
    toast.error(getApiErrorMessage(err, t('auth.verifyEmail.resendErrorDefault')))
  } finally {
    isResending.value = false
  }
}

const isVerifying = ref(false)
const verificationError = ref('')

onMounted(async () => {
  const token = route.query.token as string
  if (token) {
    isVerifying.value = true
    try {
      await post('/auth/verify-email', { token })
      await navigateTo(loginRedirectUrl())
    } catch (err: unknown) {
      verificationError.value = getApiErrorMessage(err, t('auth.verifyEmail.verificationFailedDefault'))
    } finally {
      isVerifying.value = false
    }
  } else {
    startPolling()
  }
})
</script>
