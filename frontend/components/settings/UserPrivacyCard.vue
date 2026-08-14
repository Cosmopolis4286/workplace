<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
        <ShieldCheckIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Privacidad y Datos</h3>
    </div>

    <div class="space-y-3">
      <div
        v-for="p in items"
        :key="p.key"
        class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
      >
        <div>
          <div class="font-semibold text-gray-900">{{ p.title }}</div>
          <div class="text-sm text-gray-500">{{ p.description }}</div>
        </div>
        <button
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300',
            privacy[p.key] ? 'bg-workplace-red' : 'bg-gray-300'
          ]"
          @click="toggle(p.key)"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
              privacy[p.key] ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>
    <p class="mt-4 text-xs text-gray-400 text-center">Los cambios se guardan automáticamente</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ShieldCheckIcon } from '@heroicons/vue/24/outline'

const LS_PRIVACY = 'user_privacy'

function lsGet<T>(key: string, fallback: T): T {
  if (!process.client) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch { return fallback }
}

function lsSet(key: string, val: unknown) {
  if (process.client) localStorage.setItem(key, JSON.stringify(val))
}

const privacy = ref(lsGet(LS_PRIVACY, { shareActivity: false, personalizedAds: false, analyticsConsent: true }))

const items = [
  { key: 'shareActivity' as const, title: 'Compartir actividad', description: 'Permitir que tu actividad mejore el catálogo' },
  { key: 'personalizedAds' as const, title: 'Anuncios personalizados', description: 'Ver anuncios relevantes a tus intereses' },
  { key: 'analyticsConsent' as const, title: 'Análisis de uso', description: 'Ayudarnos a mejorar la app con datos anónimos' },
]

function toggle(key: keyof typeof privacy.value) {
  privacy.value[key] = !privacy.value[key]
  lsSet(LS_PRIVACY, privacy.value)
}
</script>
