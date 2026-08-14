<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg mr-3">
        <BellIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Notificaciones</h3>
    </div>

    <div class="space-y-3">
      <div
        v-for="n in items"
        :key="n.key"
        class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
      >
        <div>
          <div class="font-semibold text-gray-900">{{ n.title }}</div>
          <div class="text-sm text-gray-500">{{ n.description }}</div>
        </div>
        <button
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300',
            notifs[n.key] ? 'bg-workplace-red' : 'bg-gray-300'
          ]"
          @click="toggle(n.key)"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
              notifs[n.key] ? 'translate-x-6' : 'translate-x-1'
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
import { BellIcon } from '@heroicons/vue/24/outline'

const LS_NOTIFS = 'user_notifications'

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

const notifs = ref(lsGet(LS_NOTIFS, { promotions: true, newProducts: true, priceAlerts: false, recommendations: true }))

const items = [
  { key: 'promotions' as const, title: 'Promociones', description: 'Ofertas y descuentos de comercios' },
  { key: 'newProducts' as const, title: 'Nuevos productos', description: 'Cuando se añadan productos de tus favoritos' },
  { key: 'priceAlerts' as const, title: 'Alertas de precio', description: 'Cambios en precios de productos que sigues' },
  { key: 'recommendations' as const, title: 'Recomendaciones', description: 'Sugerencias personalizadas basadas en tu actividad' },
]

function toggle(key: keyof typeof notifs.value) {
  notifs.value[key] = !notifs.value[key]
  lsSet(LS_NOTIFS, notifs.value)
}
</script>
