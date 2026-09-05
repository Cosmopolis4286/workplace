<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg mr-3">
        <ShieldCheckIcon class="h-6 w-6 text-white" />
      </div>
      <div>
        <h3 class="text-xl font-bold text-gray-900">Price Guard</h3>
        <p class="text-xs text-gray-500">Margen mínimo que tus precios deben proteger frente al costo de reposición</p>
      </div>
    </div>
    <div class="space-y-5">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Margen objetivo (%)</label>
          <input v-model.number="form.targetMarginPct" type="number" min="0" step="1" class="input-field">
          <p class="text-xs text-gray-400 mt-1">Referencia informativa, no bloquea nada.</p>
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Margen mínimo (%)</label>
          <input v-model.number="form.minMarginPct" type="number" min="0" step="1" class="input-field">
          <p class="text-xs text-gray-400 mt-1">Usado para calcular el precio mínimo recomendado por producto.</p>
        </div>
      </div>
      <p class="text-xs text-gray-400">
        Podés sobreescribir el margen mínimo para un producto específico desde su ficha en el catálogo.
      </p>
      <button :disabled="saving" class="btn-save btn-emerald" @click="$emit('save', { ...form })">
        <span v-if="saving" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Guardando...
        </span>
        <span v-else>Guardar Configuración de Price Guard</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ShieldCheckIcon } from '@heroicons/vue/24/outline'
import type { CommerceSettings } from '~/composables/commerce/useSettings'

const props = defineProps<{
  settings: CommerceSettings | null
  saving: boolean
}>()

defineEmits<{
  save: [form: { targetMarginPct: number; minMarginPct: number }]
}>()

const form = ref({ targetMarginPct: 30, minMarginPct: 15 })

watch(() => props.settings, (s) => {
  if (!s) return
  form.value = { targetMarginPct: s.targetMarginPct, minMarginPct: s.minMarginPct }
}, { immediate: true })
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 bg-white;
}
.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}
.btn-emerald { @apply bg-gradient-to-r from-emerald-500 to-emerald-600; }
</style>
