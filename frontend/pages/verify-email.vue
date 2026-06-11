<template>
  <AuthLayout
    title="Verifica tu correo"
    description="Un paso más para comenzar"
  >
    <div class="flex flex-col items-center text-center gap-5 py-2">
      <!-- Verifying state -->
      <div v-if="isVerifying" class="flex flex-col items-center gap-4 py-8">
        <div class="w-12 h-12 border-4 border-workplace-red border-t-transparent rounded-full animate-spin" />
        <p class="text-sm text-gray-500">Verificando tu correo...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="verificationError" class="flex flex-col items-center gap-4 py-4">
        <div class="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center">
          <ExclamationTriangleIcon class="h-10 w-10 text-red-500" />
        </div>
        <div class="space-y-2 max-w-xs">
          <h3 class="text-lg font-bold text-gray-900">Verificación fallida</h3>
          <p class="text-sm text-red-600">{{ verificationError }}</p>
        </div>
        <AuthButton
          variant="primary"
          text="Reenviar correo de verificación"
          :icon="ArrowPathIcon"
          :loading="isResending"
          @click="resendVerification"
        />
        <p v-if="resendError" class="text-sm text-red-600">{{ resendError }}</p>
      </div>

      <!-- Success/Resent state -->
      <div v-else-if="resentSuccess" class="flex flex-col items-center gap-4 py-4">
        <div class="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center">
          <CheckIcon class="h-10 w-10 text-green-600" />
        </div>
        <div class="space-y-2 max-w-xs">
          <h3 class="text-lg font-bold text-gray-900">¡Correo reenviado!</h3>
          <p class="text-sm text-gray-500">Revisa tu bandeja de entrada para el nuevo enlace de verificación.</p>
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
          <h3 class="text-lg font-bold text-gray-900">¡Casi listo!</h3>
          <p class="text-sm text-gray-500 leading-relaxed">
            Enviamos un correo de verificación a
          </p>
          <p class="text-sm font-semibold text-workplace-red bg-red-50 px-3 py-1.5 rounded-lg inline-block">
            {{ displayEmail }}
          </p>
          <p class="text-sm text-gray-500 leading-relaxed">
            Haz clic en el enlace del correo para activar tu cuenta y comenzar a usar WorkPlace Manager.
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
          <p>
            El enlace expira en <strong>24 horas</strong>. Si no ves el correo, revisa tu carpeta de spam.
          </p>
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-3 w-full">
          <AuthButton
            variant="primary"
            text="Reenviar correo de verificación"
            :icon="ArrowPathIcon"
            :loading="isResending"
            @click="resendVerification"
          />
          <AuthButton
            variant="ghost"
            text="Usar otro correo"
            :icon="ArrowLeftIcon"
            @click="navigateTo('/register')"
          />
        </div>
        <p v-if="resendError" class="text-sm text-red-600">{{ resendError }}</p>
      </template>
    </div>

    <template #footer>
      <p class="text-sm text-gray-500">
        ¿Ya verificaste tu cuenta?
        <NuxtLink to="/login" class="font-semibold text-workplace-red hover:underline ml-1">
          Inicia sesión
        </NuxtLink>
      </p>
    </template>
  </AuthLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import { ref, computed, onMounted } from 'vue'
import { EnvelopeIcon, CheckIcon, ArrowPathIcon, ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'
import { useApi } from '~/composables/useApi'
import { getApiErrorMessage } from '~/composables/useApiErrors'

const { currentUser } = useAuth()

const displayEmail = computed(() => currentUser.value?.email ?? 'tu correo')

const isResending = ref(false)
const resentSuccess = ref(false)
const resendError = ref('')

const verifySteps = computed(() => [
  { label: 'Cuenta creada', desc: 'Tu cuenta ha sido registrada exitosamente', done: true },
  { label: 'Verifica tu correo', desc: 'Haz clic en el enlace que te enviamos', done: false },
  { label: 'Comienza a usar la plataforma', desc: 'Accede a tu panel de control', done: false }
])

const resendVerification = async () => {
  isResending.value = true
  resendError.value = ''
  try {
    const { post } = useApi()
    await post('/auth/send-verification', { email: currentUser.value?.email })
    resentSuccess.value = true
  } catch (err: unknown) {
    resendError.value = getApiErrorMessage(err, 'No se pudo reenviar el correo. Inténtalo de nuevo.')
  } finally {
    isResending.value = false
  }
}

// Handle token verification when user clicks email link
const route = useRoute()
const isVerifying = ref(false)
const verificationError = ref('')

onMounted(async () => {
  const token = route.query.token as string
  if (token) {
    isVerifying.value = true
    try {
      const { post } = useApi()
      await post('/auth/verify-email', { token })
      // Verification successful, redirect to login
      await navigateTo('/login?verified=true')
    } catch (err: unknown) {
      verificationError.value = getApiErrorMessage(err, 'El enlace de verificación es inválido o ha expirado')
    } finally {
      isVerifying.value = false
    }
  }
})
</script>
