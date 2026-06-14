<template>
  <AuthLayout
    title="Verificación en dos pasos"
    description="Ingresa el código de tu app de autenticación para continuar"
  >
    <template #header-action>
      <NuxtLink
        to="/login"
        class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150"
      >
        <ArrowLeftIcon class="h-4 w-4" />
        Volver al login
      </NuxtLink>
    </template>

    <!-- Sesión expirada -->
    <div v-if="sessionExpired" class="flex flex-col items-center gap-5 py-4 text-center">
      <div class="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
        <ExclamationTriangleIcon class="h-9 w-9 text-red-500" />
      </div>
      <div class="space-y-2 max-w-xs">
        <h3 class="text-lg font-bold text-gray-900">Sesión expirada</h3>
        <p class="text-sm text-gray-500">La sesión de verificación expiró. Vuelve a iniciar sesión.</p>
      </div>
      <AuthButton variant="primary" text="Ir al login" :icon="ArrowRightIcon" @click="navigateTo('/login')" />
    </div>

    <!-- Formulario de verificación -->
    <form v-else @submit.prevent="handleVerify" class="space-y-5" novalidate>
      <div class="flex flex-col items-center text-center gap-3 pb-2">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-workplace-red/10 to-red-600/10 flex items-center justify-center border border-red-100">
          <ShieldCheckIcon class="h-7 w-7 text-workplace-red" />
        </div>
        <p class="text-sm text-gray-500 max-w-xs leading-relaxed">
          {{ useBackupCode
            ? 'Ingresa uno de tus códigos de respaldo (formato XXXX-XXXX).'
            : 'Ingresa el código de 6 dígitos de tu app de autenticación.' }}
        </p>
      </div>

      <div
        v-if="generalError"
        class="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
        role="alert"
      >
        <ExclamationCircleIcon class="h-4 w-4 flex-shrink-0 mt-0.5 text-red-500" />
        <span>{{ generalError }}</span>
      </div>

      <AuthInput
        v-if="!useBackupCode"
        id="code"
        v-model="code"
        type="text"
        label="Código de verificación"
        placeholder="123456"
        inputmode="numeric"
        :icon="KeyIcon"
        autocomplete="one-time-code"
        required
      />

      <AuthInput
        v-else
        id="backup-code"
        v-model="code"
        type="text"
        label="Código de respaldo"
        placeholder="XXXX-XXXX"
        :icon="KeyIcon"
        autocomplete="one-time-code"
        required
      />

      <AuthButton
        type="submit"
        text="Verificar"
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
          {{ useBackupCode ? '¿Tienes tu app de autenticación? Usa el código de 6 dígitos' : '¿No tienes acceso? Usa un código de respaldo' }}
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
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { getApiErrorMessage } from '~/composables/useApiErrors'

const route = useRoute()
const { verifyTwoFactor } = useAuth()

const sessionId = route.query.sessionId as string

const code = ref('')
const useBackupCode = ref(false)
const isLoading = ref(false)
const generalError = ref('')
const sessionExpired = ref(false)

if (!sessionId) {
  sessionExpired.value = true
}

const toggleBackupCode = () => {
  useBackupCode.value = !useBackupCode.value
  code.value = ''
  generalError.value = ''
}

const handleVerify = async () => {
  if (!code.value) return

  isLoading.value = true
  generalError.value = ''

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
    generalError.value = getApiErrorMessage(err, 'Código inválido o expirado. Intenta de nuevo.')
  } finally {
    isLoading.value = false
  }
}
</script>
