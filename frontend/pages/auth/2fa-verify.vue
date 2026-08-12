<template>
  <AuthLayout
    :title="t('auth.twoFactor.title')"
    :description="t('auth.twoFactor.description')"
  >
    <template #header-action>
      <NuxtLink
        to="/login"
        class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150"
      >
        <ArrowLeftIcon class="h-4 w-4" />
        {{ t('auth.twoFactor.backToLogin') }}
      </NuxtLink>
    </template>

    <!-- Sesión expirada -->
    <div v-if="sessionExpired" class="flex flex-col items-center gap-5 py-4 text-center">
      <div class="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
        <ExclamationTriangleIcon class="h-9 w-9 text-red-500" />
      </div>
      <div class="space-y-2 max-w-xs">
        <h3 class="text-lg font-bold text-gray-900">{{ t('auth.twoFactor.sessionExpiredTitle') }}</h3>
        <p class="text-sm text-gray-500">{{ t('auth.twoFactor.sessionExpiredDesc') }}</p>
      </div>
      <AuthButton variant="primary" :text="t('auth.twoFactor.goToLogin')" :icon="ArrowRightIcon" @click="navigateTo('/login')" />
    </div>

    <!-- Formulario de verificación -->
    <form v-else @submit.prevent="handleVerify" class="space-y-5" novalidate>
      <div class="flex flex-col items-center text-center gap-3 pb-2">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-workplace-red/10 to-red-600/10 flex items-center justify-center border border-red-100">
          <ShieldCheckIcon class="h-7 w-7 text-workplace-red" />
        </div>
        <p class="text-sm text-gray-500 max-w-xs leading-relaxed">
          {{ useBackupCode ? t('auth.twoFactor.instructionsBackup') : t('auth.twoFactor.instructionsCode') }}
        </p>
      </div>

      <AuthInput
        v-if="!useBackupCode"
        id="code"
        v-model="code"
        type="text"
        :label="t('auth.twoFactor.codeLabel')"
        placeholder="123456"
        inputmode="numeric"
        :icon="KeyIcon"
        autocomplete="one-time-code"
        required
        @input="onCodeInput"
      />

      <AuthInput
        v-else
        id="backup-code"
        v-model="code"
        type="text"
        :label="t('auth.twoFactor.backupCodeLabel')"
        placeholder="XXXX-XXXX"
        :icon="KeyIcon"
        autocomplete="one-time-code"
        required
        @input="onBackupCodeInput"
      />

      <AuthButton
        type="submit"
        :text="t('auth.twoFactor.submit')"
        :loading="isLoading"
        :icon="ShieldCheckIcon"
        variant="primary"
      />

      <div class="text-center">
        <button
          type="button"
          class="text-xs font-semibold text-workplace-red hover:underline"
          @click="toggleBackupCode"
        >
          {{ useBackupCode ? t('auth.twoFactor.useAuthApp') : t('auth.twoFactor.useBackupCode') }}
        </button>
      </div>
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import { ref } from 'vue'
import {
  KeyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { getApiErrorMessage } from '~/composables/useApiErrors'
import { useToast } from '~/composables/useToast'

const { t } = useI18n()
useHead({ title: () => `${t('auth.twoFactor.title')} — ${t('common.appName')}` })

const route = useRoute()
const { verifyTwoFactor } = useAuth()
const toast = useToast()

const sessionId = route.query.sessionId as string

const code = ref('')
const useBackupCode = ref(false)
const isLoading = ref(false)
const sessionExpired = ref(false)

if (!sessionId) {
  sessionExpired.value = true
}

const toggleBackupCode = () => {
  useBackupCode.value = !useBackupCode.value
  code.value = ''
}

function onCodeInput() {
  // Solo dígitos, máximo 6
  code.value = code.value.replace(/\D/g, '').slice(0, 6)
  // Auto-submit cuando se completan 6 dígitos
  if (code.value.length === 6) handleVerify()
}

function onBackupCodeInput() {
  // Formato XXXX-XXXX: letras y números, guion automático
  const clean = code.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
  code.value = clean.length > 4 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean
}

const handleVerify = async () => {
  if (!code.value || isLoading.value) return

  isLoading.value = true

  try {
    await verifyTwoFactor(sessionId, code.value)
    await navigateTo('/dashboard')
  } catch (err: unknown) {
    const status = (err as { status?: number; statusCode?: number })?.status
      ?? (err as { status?: number; statusCode?: number })?.statusCode
    if (status === 401) {
      const message = getApiErrorMessage(err, '')
      if (message.toLowerCase().includes('expir')) {
        sessionExpired.value = true
        return
      }
    }
    toast.error(getApiErrorMessage(err, t('auth.twoFactor.invalidCode')))
  } finally {
    isLoading.value = false
  }
}
</script>
