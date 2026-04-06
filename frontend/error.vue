<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
    <div class="max-w-md w-full text-center space-y-6">

      <!-- Illustration -->
      <div class="relative mx-auto w-40 h-40">
        <div class="w-40 h-40 rounded-full bg-gradient-to-br from-workplace-red/10 to-red-600/10 flex items-center justify-center border-2 border-red-100">
          <span class="text-7xl font-black text-workplace-red select-none leading-none">
            {{ error?.statusCode === 404 ? '404' : error?.statusCode ?? '?' }}
          </span>
        </div>
        <!-- Floating icon -->
        <div class="absolute -top-2 -right-2 w-10 h-10 bg-white rounded-full border-2 border-red-100 shadow-md flex items-center justify-center">
          <svg class="h-5 w-5 text-workplace-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <!-- Text -->
      <div class="space-y-3">
        <h1 class="text-2xl font-black text-gray-900">
          {{ title }}
        </h1>
        <p class="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
          {{ description }}
        </p>
      </div>

      <!-- Error detail (dev only) -->
      <div v-if="isDev && error?.message" class="px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-left">
        <p class="text-xs font-mono text-red-600 break-all">{{ error.message }}</p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          @click="handleError"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-workplace-red to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Ir al inicio
        </button>
        <button
          @click="$router.go(-1)"
          class="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver atrás
        </button>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError | null }>()

const isDev = process.env.NODE_ENV === 'development'

const title = computed(() => {
  if (props.error?.statusCode === 404) return 'Página no encontrada'
  if (props.error?.statusCode === 403) return 'Acceso denegado'
  if (props.error?.statusCode === 401) return 'No autenticado'
  if (props.error?.statusCode === 500) return 'Error del servidor'
  return 'Algo salió mal'
})

const description = computed(() => {
  if (props.error?.statusCode === 404) return 'La página que buscas no existe o fue movida. Verifica la URL o regresa al inicio.'
  if (props.error?.statusCode === 403) return 'No tienes permisos para acceder a esta sección.'
  if (props.error?.statusCode === 401) return 'Debes iniciar sesión para acceder a esta página.'
  if (props.error?.statusCode === 500) return 'Ocurrió un error inesperado en el servidor. Por favor, intenta más tarde.'
  return 'Ocurrió un error inesperado. Por favor, intenta de nuevo.'
})

function handleError() {
  clearError({ redirect: '/dashboard' })
}
</script>
