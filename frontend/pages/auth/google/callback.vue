<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center space-y-4">
      <div v-if="error" class="space-y-4 max-w-sm mx-auto px-4">
        <div class="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto">
          <ExclamationCircleIcon class="h-7 w-7 text-red-500" />
        </div>
        <p class="text-gray-900 font-semibold">Error al iniciar sesión con Google</p>
        <p class="text-sm text-gray-500">{{ error }}</p>
        <NuxtLink
          to="/login"
          class="inline-flex items-center gap-2 text-sm font-semibold text-ifood-red hover:underline"
        >
          <ArrowLeftIcon class="h-4 w-4" />
          Volver al login
        </NuxtLink>
      </div>

      <div v-else class="space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-ifood-red/10 border border-red-100 flex items-center justify-center mx-auto">
          <svg class="animate-spin h-6 w-6 text-ifood-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
        <p class="text-sm text-gray-500 font-medium">Iniciando sesión con Google…</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false })

import { onMounted, ref } from 'vue'
import { ExclamationCircleIcon, ArrowLeftIcon } from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'

const { setSession } = useAuth()
const error = ref('')

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('accessToken')
    const refreshToken = params.get('refreshToken')
    const userRaw = params.get('user')

    if (!accessToken || !refreshToken || !userRaw) {
      error.value = 'Parámetros de autenticación inválidos. Intenta de nuevo.'
      return
    }

    const user = JSON.parse(decodeURIComponent(userRaw))
    setSession({ user, accessToken, refreshToken })
    await navigateTo('/dashboard')
  } catch {
    error.value = 'Error inesperado al completar el inicio de sesión.'
  }
})
</script>
