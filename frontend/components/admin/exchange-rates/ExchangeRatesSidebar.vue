<template>
  <div class="space-y-4">

    <!-- Vista previa de conversión -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Vista previa</h3>
      <div class="flex items-center gap-2 mb-4">
        <span class="text-gray-500 text-sm">$</span>
        <input :value="previewAmount" type="number" min="0" step="1" placeholder="100" class="input-field w-24 text-center" @input="$emit('update:previewAmount', Number(($event.target as HTMLInputElement).value))" />
        <span class="text-gray-500 text-sm">USD</span>
      </div>
      <div v-if="activeRates.length > 0" class="space-y-2">
        <div v-for="rate in activeRates" :key="rate.id" class="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-700">{{ rate.code }}</span>
            <StarIcon v-if="rate.isDefault" class="h-3 w-3 text-red-400" />
          </div>
          <span class="font-mono font-semibold text-gray-900 text-sm">
            {{ rate.symbol }} {{ formatConversion(previewAmount || 0, rate).replace(rate.symbol + ' ', '') }}
          </span>
        </div>
      </div>
      <p v-else class="text-xs text-gray-400">No hay monedas activas.</p>
    </div>

    <!-- Estado de sincronización -->
    <div v-if="syncStatuses.length > 0" class="card p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-700">Sincronización auto</h3>
        <button v-if="canManage" class="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50" :disabled="syncingAll" @click="$emit('sync-all')">
          <ArrowPathIcon class="h-3 w-3" :class="{ 'animate-spin': syncingAll }" />
          {{ syncingAll ? 'Sincronizando...' : 'Sincronizar todas' }}
        </button>
      </div>
      <div class="space-y-2">
        <div v-for="s in syncStatuses" :key="s.currencyCode" class="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-gray-700">{{ s.currencyCode }}</span>
            <span v-if="s.syncError" class="badge bg-red-100 text-red-700 flex items-center gap-0.5" :title="s.syncError">
              <ExclamationTriangleIcon class="h-2.5 w-2.5" />Error
            </span>
            <span v-else-if="s.isStale" class="badge bg-yellow-100 text-yellow-700">Atrasada</span>
            <span v-else class="badge bg-green-100 text-green-700">Al día</span>
          </div>
          <span class="text-[10px] text-gray-400">{{ s.lastSyncAt ? formatDateTime(s.lastSyncAt) : 'Nunca' }}</span>
        </div>
      </div>
    </div>

    <!-- Resumen -->
    <div class="card p-5 border-l-4 border-l-red-400">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Resumen</h3>
      <div class="space-y-2.5">
        <div class="flex justify-between text-sm"><span class="text-gray-500">Total monedas</span><span class="font-bold text-gray-900">{{ stats?.total ?? '—' }}</span></div>
        <div class="flex justify-between text-sm"><span class="text-gray-500">Activas</span><span class="font-bold text-green-600">{{ stats?.active ?? '—' }}</span></div>
        <div class="flex justify-between text-sm"><span class="text-gray-500">Inactivas</span><span class="font-bold text-gray-400">{{ stats?.inactive ?? '—' }}</span></div>
        <div class="h-px bg-gray-100" />
        <div class="flex justify-between text-sm">
          <span class="text-gray-500">Predeterminada</span>
          <span class="font-bold text-red-600">{{ stats?.defaultCurrency ?? '—' }}</span>
        </div>
        <div v-if="stats?.defaultRate" class="text-xs text-gray-400 text-right">1 USD = {{ formatNumber(stats.defaultRate, { maximumFractionDigits: 4 }) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { StarIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import type { ExchangeRate, ExchangeRateStats, SyncStatusEntry } from '~/composables/wallets/useExchangeRates'

defineProps<{
  previewAmount: number
  activeRates: ExchangeRate[]
  formatConversion: (amount: number, rate: ExchangeRate) => string
  syncStatuses: SyncStatusEntry[]
  canManage: boolean
  syncingAll: boolean
  formatDateTime: (date: string) => string
  stats: ExchangeRateStats | null
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string
}>()

defineEmits<{
  'update:previewAmount': [value: number]
  'sync-all': []
}>()
</script>
