<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg mr-3">
        <ClockIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Operaciones</h3>
    </div>
    <div class="space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Tiempo Prep. (min)</label>
          <input v-model.number="form.avgPrepTime" type="number" min="1" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Tiempo Entrega (min)</label>
          <input v-model.number="form.avgDeliveryTime" type="number" min="1" class="input-field">
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Costo de Envío ($)</label>
          <input v-model.number="form.deliveryFee" type="number" min="0" step="0.01" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Envío Gratis desde ($)</label>
          <input v-model.number="form.freeDeliveryMinimum" type="number" min="0" step="0.01" class="input-field">
        </div>
      </div>
      <div class="p-4 bg-orange-50 rounded-xl border border-orange-100">
        <p class="text-xs font-semibold text-orange-700 mb-2">Resumen de operaciones</p>
        <div class="grid grid-cols-2 gap-2 text-xs text-orange-600">
          <span>Prep promedio: <strong>{{ form.avgPrepTime }} min</strong></span>
          <span>Entrega promedio: <strong>{{ form.avgDeliveryTime }} min</strong></span>
          <span>Costo envío: <strong>${{ form.deliveryFee }}</strong></span>
          <span>Gratis desde: <strong>${{ form.freeDeliveryMinimum }}</strong></span>
        </div>
      </div>
      <button :disabled="saving" class="btn-save btn-orange" @click="$emit('save', { ...form })">
        <span v-if="saving" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Guardando...
        </span>
        <span v-else>Guardar Configuración de Operaciones</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ClockIcon } from '@heroicons/vue/24/outline'
import type { CommerceSettings } from '~/composables/commerce/useSettings'

const props = defineProps<{
  settings: CommerceSettings | null
  saving: boolean
}>()

defineEmits<{
  save: [form: { avgPrepTime: number; avgDeliveryTime: number; deliveryFee: number; freeDeliveryMinimum: number }]
}>()

const form = ref({ avgPrepTime: 20, avgDeliveryTime: 30, deliveryFee: 35, freeDeliveryMinimum: 200 })

watch(() => props.settings, (s) => {
  if (!s) return
  form.value = {
    avgPrepTime: s.avgPrepTime,
    avgDeliveryTime: s.avgDeliveryTime,
    deliveryFee: s.deliveryFee,
    freeDeliveryMinimum: s.freeDeliveryMinimum,
  }
}, { immediate: true })
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white;
}
.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}
.btn-orange { @apply bg-gradient-to-r from-orange-500 to-orange-600; }
</style>
