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
        v-for="notif in items"
        :key="notif.key"
        class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200"
      >
        <div>
          <div class="font-semibold text-gray-900">{{ notif.title }}</div>
          <div class="text-sm text-gray-500">{{ notif.description }}</div>
        </div>
        <button
          :class="[
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300',
            form[notif.key] ? 'bg-workplace-red' : 'bg-gray-300'
          ]"
          @click="toggle(notif.key)"
        >
          <span
            :class="[
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
              form[notif.key] ? 'translate-x-6' : 'translate-x-1'
            ]"
          />
        </button>
      </div>
    </div>
    <p class="mt-4 text-xs text-gray-400 text-center">Los cambios se guardan automáticamente</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { BellIcon } from '@heroicons/vue/24/outline'
import type { CommerceSettings, FreelancerSettingsData } from '~/composables/commerce/useSettings'

const props = defineProps<{
  settings: CommerceSettings | FreelancerSettingsData | null
  isFreelancer: boolean
}>()

const emit = defineEmits<{
  save: [form: Record<string, boolean>]
}>()

const commerceItems = [
  { key: 'notifyNewOrders' as const, title: 'Nuevos Pedidos', description: 'Recibir notificaciones de pedidos nuevos' },
  { key: 'notifyLowStock' as const, title: 'Stock Bajo', description: 'Alertas cuando productos están por agotarse' },
  { key: 'notifyDailyReports' as const, title: 'Reportes Diarios', description: 'Recibir resumen diario de ventas' },
  { key: 'notifyCustomerReviews' as const, title: 'Reseñas de Clientes', description: 'Notificaciones de nuevas reseñas' },
]

const freelancerItems = [
  { key: 'notifyNewRequests' as const, title: 'Nuevas Solicitudes', description: 'Recibir notificaciones cuando un cliente solicita tu servicio' },
  { key: 'notifyRequestUpdates' as const, title: 'Actualizaciones de Solicitudes', description: 'Cambios de estado en tus solicitudes activas' },
  { key: 'notifyDailyReports' as const, title: 'Reportes Diarios', description: 'Recibir resumen diario de tu actividad' },
  { key: 'notifyCustomerReviews' as const, title: 'Reseñas de Clientes', description: 'Notificaciones de nuevas reseñas' },
]

const items = computed(() => props.isFreelancer ? freelancerItems : commerceItems)

const form = ref<Record<string, boolean>>({ notifyNewOrders: true, notifyLowStock: true, notifyDailyReports: false, notifyCustomerReviews: true })

watch(() => props.settings, (s) => {
  if (!s) return
  if (props.isFreelancer) {
    const fs = s as FreelancerSettingsData
    form.value = {
      notifyNewRequests: fs.notifyNewRequests,
      notifyRequestUpdates: fs.notifyRequestUpdates,
      notifyDailyReports: fs.notifyDailyReports,
      notifyCustomerReviews: fs.notifyCustomerReviews,
    }
  } else {
    const cs = s as CommerceSettings
    form.value = {
      notifyNewOrders: cs.notifyNewOrders,
      notifyLowStock: cs.notifyLowStock,
      notifyDailyReports: cs.notifyDailyReports,
      notifyCustomerReviews: cs.notifyCustomerReviews,
    }
  }
}, { immediate: true })

function toggle(key: string) {
  form.value[key] = !form.value[key]
  emit('save', { ...form.value })
}
</script>
