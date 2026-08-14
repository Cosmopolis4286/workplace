<template>
  <div class="card-premium p-6">
    <div class="flex items-center mb-6">
      <div class="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg mr-3">
        <CurrencyDollarIcon class="h-6 w-6 text-white" />
      </div>
      <h3 class="text-xl font-bold text-gray-900">Configuración de Pagos</h3>
    </div>
    <div class="space-y-5">
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-2">Moneda</label>
        <select v-model="form.currency" class="input-field">
          <option v-for="rate in activeRates" :key="rate.code" :value="rate.code">
            {{ rate.code }} — {{ rate.name }}
          </option>
          <option v-if="activeRates.length === 0" disabled value="">Cargando monedas...</option>
        </select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Impuesto (%)</label>
          <input v-model.number="form.tax" type="number" min="0" max="100" step="0.01" class="input-field">
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Propina Sugerida (%)</label>
          <input v-model.number="form.suggestedTip" type="number" min="0" max="100" step="0.01" class="input-field">
        </div>
      </div>
      <div>
        <label class="block text-sm font-semibold text-gray-700 mb-3">Métodos de Pago Aceptados</label>
        <div class="space-y-2">
          <div
            v-for="method in paymentMethodOptions"
            :key="method.id"
            class="flex items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            @click="togglePaymentMethod(method.id)"
          >
            <div
              :class="[
                'h-5 w-5 rounded border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors',
                form.paymentMethods.includes(method.id) ? 'bg-workplace-red border-workplace-red' : 'bg-white border-gray-300'
              ]"
            >
              <CheckIcon v-if="form.paymentMethods.includes(method.id)" class="h-3 w-3 text-white" />
            </div>
            <span class="text-gray-900 font-medium">{{ method.name }}</span>
          </div>
        </div>
      </div>
      <button :disabled="saving" class="btn-save btn-yellow" @click="$emit('save', { ...form })">
        <span v-if="saving" class="flex items-center justify-center gap-2">
          <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Guardando...
        </span>
        <span v-else>Guardar Configuración de Pagos</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { CurrencyDollarIcon, CheckIcon } from '@heroicons/vue/24/outline'
import { useExchangeRates } from '~/composables/wallets/useExchangeRates'
import type { CommerceSettings, FreelancerSettingsData } from '~/composables/commerce/useSettings'

const props = defineProps<{
  settings: CommerceSettings | FreelancerSettingsData | null
  saving: boolean
}>()

defineEmits<{
  save: [form: { currency: string; tax: number; suggestedTip: number; paymentMethods: string[] }]
}>()

const { activeRates, fetchRates } = useExchangeRates()

const paymentMethodOptions = [
  { id: 'cash', name: 'Efectivo' },
  { id: 'card', name: 'Tarjeta de Crédito/Débito' },
  { id: 'transfer', name: 'Transferencia Bancaria' },
  { id: 'digital-wallet', name: 'Monedero Digital' },
]

const form = ref({ currency: 'MXN', tax: 16, suggestedTip: 10, paymentMethods: ['cash', 'card', 'transfer'] as string[] })

watch(() => props.settings, (s) => {
  if (!s) return
  if ('tax' in s) {
    form.value = { currency: s.currency, tax: s.tax, suggestedTip: s.suggestedTip, paymentMethods: [...s.paymentMethods] }
  } else {
    form.value = { ...form.value, currency: s.currency }
  }
}, { immediate: true })

function togglePaymentMethod(id: string) {
  const idx = form.value.paymentMethods.indexOf(id)
  if (idx === -1) form.value.paymentMethods.push(id)
  else form.value.paymentMethods.splice(idx, 1)
}

onMounted(() => { fetchRates(false, true) })
</script>

<style scoped>
.input-field {
  @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white;
}
.btn-save {
  @apply w-full px-6 py-3 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100;
}
.btn-yellow { @apply bg-gradient-to-r from-yellow-500 to-yellow-600; }
</style>
