<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 class="text-base font-bold text-gray-900">{{ editingRate ? 'Editar Moneda' : 'Nueva Moneda' }}</h2>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>
          <form @submit.prevent="$emit('submit')" class="p-6 space-y-4">
            <div v-if="formError" class="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs">{{ formError }}</div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Código <span class="text-red-500">*</span></label>
                <input v-model="form.code" type="text" required maxlength="10" placeholder="VES" class="input-field uppercase" />
                <p class="text-xs text-gray-400 mt-1">ISO (ej. VES, COP, EUR)</p>
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Símbolo <span class="text-red-500">*</span></label>
                <input v-model="form.symbol" type="text" required maxlength="20" placeholder="Bs." class="input-field" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Nombre <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" required maxlength="100" placeholder="Bolívar Venezolano" class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Tasa (1 USD = X moneda) <span class="text-red-500">*</span></label>
              <div class="relative">
                <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">1 USD =</span>
                <input v-model.number="form.rateToUsd" type="number" required min="0.000001" step="any" placeholder="36.50" class="input-field pl-16" />
              </div>
              <p v-if="form.rateToUsd && form.code" class="text-xs text-gray-400 mt-1">
                $100 USD = {{ form.symbol || form.code }} {{ formatNumber(100 * form.rateToUsd, { maximumFractionDigits: 2 }) }}
              </p>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Fuente / Referencia</label>
              <input v-model="form.source" type="text" maxlength="100" placeholder="BCV, Paralelo, Manual..." class="input-field" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Notas</label>
              <textarea v-model="form.notes" rows="2" maxlength="500" class="input-field resize-none" />
            </div>
            <div class="flex flex-wrap gap-5">
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input v-model="form.isActive" type="checkbox" class="rounded border-gray-300 text-red-600" />Activa
              </label>
              <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input v-model="form.isDefault" type="checkbox" class="rounded border-gray-300 text-red-600" />Predeterminada
              </label>
              <label v-if="form.code.toUpperCase() === 'VES'" class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer" title="Sincronizar con BCV diariamente a las 5 PM">
                <input v-model="form.autoSync" type="checkbox" class="rounded border-gray-300 text-green-600" />
                <span class="flex items-center gap-1"><ArrowPathIcon class="h-4 w-4 text-green-600" />Auto-sync BCV</span>
              </label>
            </div>
            <!-- Panel BCV en edición -->
            <div v-if="editingRate?.code === 'VES'" class="bg-green-50 border border-green-100 rounded-xl p-3">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-green-800">Sincronización BCV</p>
                  <p class="text-xs text-green-600 mt-0.5">
                    {{ editingRate.autoSync ? '✅ Auto-sync activado' : '⚠️ Auto-sync desactivado' }}
                    <span v-if="editingRate.lastSyncAt"> · {{ formatDateTime(editingRate.lastSyncAt) }}</span>
                  </p>
                </div>
                <button v-if="editingRate.autoSync" type="button" class="btn-secondary text-xs" :disabled="syncing" @click="$emit('manual-sync')">
                  {{ syncing ? 'Sincronizando...' : 'Sincronizar ahora' }}
                </button>
              </div>
              <div v-if="editingRate.syncError" class="mt-2 pt-2 border-t border-green-100 flex items-start gap-1.5">
                <ExclamationTriangleIcon class="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <p class="text-xs text-red-600">
                  {{ editingRate.syncError }}
                  <span v-if="editingRate.syncAttempts" class="text-red-400">({{ editingRate.syncAttempts }} intento{{ editingRate.syncAttempts === 1 ? '' : 's' }} fallido{{ editingRate.syncAttempts === 1 ? '' : 's' }})</span>
                </p>
              </div>
            </div>
            <div class="flex gap-3 pt-2">
              <button type="button" class="btn-secondary flex-1" @click="$emit('close')">Cancelar</button>
              <button type="submit" :disabled="saving" class="btn-primary flex-1">
                {{ saving ? 'Guardando...' : (editingRate ? 'Actualizar' : 'Crear') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { XMarkIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import type { ExchangeRate } from '~/composables/wallets/useExchangeRates'

export interface ExchangeRateForm {
  code: string
  name: string
  symbol: string
  rateToUsd: number | null
  source: string
  notes: string
  isActive: boolean
  isDefault: boolean
  autoSync: boolean
}

defineProps<{
  show: boolean
  editingRate: ExchangeRate | null
  saving: boolean
  syncing: boolean
  formError: string | null
  form: ExchangeRateForm
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string
  formatDateTime: (date: string) => string
}>()

defineEmits<{
  close: []
  submit: []
  'manual-sync': []
}>()
</script>
