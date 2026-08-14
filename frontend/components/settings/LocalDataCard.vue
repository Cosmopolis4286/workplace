<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg mr-3">
        <CircleStackIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Datos Locales</h3>
    </div>

    <div class="space-y-4">
      <!-- Favoritos -->
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <div class="font-semibold text-gray-900">Productos favoritos</div>
          <div class="text-sm text-gray-500">
            {{ favoritesCount }} producto{{ favoritesCount !== 1 ? 's' : '' }} guardado{{ favoritesCount !== 1 ? 's' : '' }}
          </div>
        </div>
        <button
          class="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          @click="clearFavorites"
        >
          Limpiar
        </button>
      </div>

      <!-- Caché -->
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <div class="font-semibold text-gray-900">Caché del catálogo</div>
          <div class="text-sm text-gray-500">Preferencias y filtros guardados</div>
        </div>
        <button
          class="px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          @click="clearCache"
        >
          Limpiar
        </button>
      </div>

      <!-- Info -->
      <div class="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p class="text-xs font-semibold text-blue-700 mb-1">¿Qué se guarda en tu dispositivo?</p>
        <p class="text-xs text-blue-600">Tus preferencias, favoritos y ajustes de notificaciones se almacenan localmente en tu navegador. Nunca se envían a servidores externos sin tu consentimiento.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CircleStackIcon } from '@heroicons/vue/24/outline'

const emit = defineEmits<{
  cleared: [message: string]
}>()

const favoritesCount = computed(() => {
  if (!process.client) return 0
  try {
    const raw = localStorage.getItem('catalog_favorites')
    return raw ? (JSON.parse(raw) as string[]).length : 0
  } catch { return 0 }
})

function clearFavorites() {
  if (process.client) localStorage.removeItem('catalog_favorites')
  emit('cleared', 'Favoritos eliminados')
}

function clearCache() {
  if (!process.client) return
  const keep = ['auth_user', 'auth_access_token', 'auth_refresh_token', 'user_preferences', 'user_notifications', 'user_privacy', 'app_lock_enabled']
  Object.keys(localStorage).forEach(k => { if (!keep.includes(k)) localStorage.removeItem(k) })
  emit('cleared', 'Caché limpiado')
}
</script>
