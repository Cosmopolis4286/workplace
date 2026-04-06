<template>
  <AuthLayout
    title="Nueva contraseña"
    description="Elige una contraseña segura para tu cuenta"
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

    <!-- Invalid token -->
    <div v-if="tokenError" class="flex flex-col items-center gap-5 py-4 text-center">
      <div class="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
        <ExclamationTriangleIcon class="h-9 w-9 text-red-500" />
      </div>
      <div class="space-y-2 max-w-xs">
        <h3 class="text-lg font-bold text-gray-900">Enlace inválido</h3>
        <p class="text-sm text-gray-500">{{ tokenError }}</p>
      </div>
      <AuthButton variant="primary" text="Solicitar nuevo enlace" :icon="ArrowPathIcon" @click="navigateTo('/recover-password')" />
    </div>

    <!-- Success -->
    <div v-else-if="success" class="flex flex-col items-center gap-5 py-4 text-center">
      <div class="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
        <CheckCircleIcon class="h-9 w-9 text-green-600" />
      </div>
      <div class="space-y-2 max-w-xs">
        <h3 class="text-lg font-bold text-gray-900">¡Contraseña actualizada!</h3>
        <p class="text-sm text-gray-500">Ya puedes iniciar sesión con tu nueva contraseña.</p>
      </div>
      <AuthButton variant="primary" text="Ir al login" :icon="ArrowRightIcon" @click="navigateTo('/login')" />
    </div>

    <!-- Form -->
    <form v-else @submit.prevent="handleReset" class="space-y-5" novalidate>
      <div class="flex flex-col items-center text-center gap-3 pb-2">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-workplace-red/10 to-red-600/10 flex items-center justify-center border border-red-100">
          <LockClosedIcon class="h-7 w-7 text-workplace-red" />
        </div>
        <p class="text-sm text-gray-500 max-w-xs leading-relaxed">
          Ingresa tu nueva contraseña. Debe tener al menos 8 caracteres.
        </p>
      </div>

      <AuthInput
        id="password"
        v-model="form.password"
        type="password"
        label="Nueva contraseña"
        placeholder="••••••••"
        :icon="LockClosedIcon"
        :error="errors.password"
        autocomplete="new-password"
        required
      />

      <AuthInput
        id="confirm"
        v-model="form.confirm"
        type="password"
        label="Confirmar contraseña"
        placeholder="••••••••"
        :icon="LockClosedIcon"
        :error="errors.confirm"
        autocomplete="new-password"
        required
      />

      <AuthButton
        type="submit"
        text="Guardar contraseña"
        :loading="isLoading"
        :icon="CheckCircleIcon"
        variant="primary"
      />
    </form>
  </AuthLayout>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'auth' })

import { ref, reactive } from 'vue'
import {
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/outline'

const route = useRoute()
const token = route.query.token as string

const form = reactive({ password: '', confirm: '' })
const errors = reactive({ password: '', confirm: '' })
const isLoading = ref(false)
const success = ref(false)
const tokenError = ref('')

// If no token in URL, show error immediately
if (!token) {
  tokenError.value = 'No se encontró un token de recuperación. Solicita un nuevo enlace.'
}

const handleReset = async () => {
  errors.password = form.password.length < 8 ? 'Mínimo 8 caracteres' : ''
  errors.confirm = form.password !== form.confirm ? 'Las contraseñas no coinciden' : ''
  if (errors.password || errors.confirm) return

  isLoading.value = true
  try {
    const config = useRuntimeConfig()
    await $fetch(`${config.public.apiUrl}/auth/reset-password`, {
      method: 'POST',
      body: { token, password: form.password },
    })
    success.value = true
  } catch (err: any) {
    tokenError.value = err?.data?.message || 'El enlace es inválido o ha expirado.'
  } finally {
    isLoading.value = false
  }
}
</script>
