<template>
  <div class="space-y-4">
    <!-- Filtros -->
    <div class="card p-4 flex flex-col sm:flex-row gap-3 items-center">
      <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none flex-shrink-0">
        <input :checked="showInactive" type="checkbox" class="rounded border-gray-300 text-red-600" @change="$emit('update:showInactive', ($event.target as HTMLInputElement).checked)" />
        Mostrar inactivas
      </label>
      <div class="relative flex-1">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input :value="search" type="text" placeholder="Buscar moneda..." class="input-field pl-9" @input="$emit('update:search', ($event.target as HTMLInputElement).value)" />
      </div>
    </div>

    <!-- Tabla -->
    <div class="card overflow-hidden">
      <!-- Skeleton -->
      <template v-if="loading">
        <div v-for="i in 4" :key="i" class="p-4 flex items-center gap-4 border-b border-gray-100">
          <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
          <div class="flex-1 space-y-2"><div class="skeleton h-4 w-32 rounded" /><div class="skeleton h-3 w-48 rounded" /></div>
          <div class="skeleton h-6 w-20 rounded-full" />
        </div>
      </template>

      <!-- Vacío -->
      <div v-else-if="rates.length === 0" class="p-12 text-center">
        <CurrencyDollarIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500 font-medium">No se encontraron monedas</p>
      </div>

      <!-- Filas -->
      <template v-else>
        <!-- Cabecera -->
        <div class="px-5 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-12 gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <div class="col-span-4">Moneda</div>
          <div class="col-span-3">Tasa (1 USD =)</div>
          <div class="col-span-2 hidden sm:block">Fuente</div>
          <div class="col-span-2">Estado</div>
          <div class="col-span-1"></div>
        </div>

        <div class="divide-y divide-gray-100">
          <div v-for="rate in rates" :key="rate.id" class="px-5 py-3.5 grid grid-cols-12 gap-3 items-center hover:bg-gray-50 transition-colors group">
            <!-- Moneda -->
            <div class="col-span-4 flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm flex-shrink-0">
                {{ rate.symbol }}
              </div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-semibold text-gray-900 text-sm">{{ rate.code }}</span>
                  <span v-if="rate.isDefault" class="badge bg-red-100 text-red-700 text-[10px]">Predeterminada</span>
                </div>
                <p class="text-xs text-gray-400">{{ rate.name }}</p>
              </div>
            </div>

            <!-- Tasa -->
            <div class="col-span-3">
              <span class="font-mono font-semibold text-gray-900 text-sm">
                {{ formatNumber(rate.rateToUsd, { minimumFractionDigits: 2, maximumFractionDigits: 6 }) }}
                <span class="text-gray-400 font-normal text-xs">{{ rate.code }}</span>
              </span>
              <p class="text-[10px] text-gray-400 mt-0.5">${{ previewAmount }} → {{ rate.symbol }} {{ formatNumber(previewAmount * rate.rateToUsd, { maximumFractionDigits: 2 }) }}</p>
            </div>

            <!-- Fuente -->
            <div class="col-span-2 hidden sm:flex items-center gap-1">
              <span v-if="rate.source" class="badge bg-gray-100 text-gray-600">{{ rate.source }}</span>
              <span v-else class="text-xs text-gray-400">—</span>
              <span v-if="rate.code === 'VES' && rate.autoSync" class="badge bg-green-100 text-green-700 flex items-center gap-0.5">
                <ArrowPathIcon class="h-2.5 w-2.5" />BCV
              </span>
              <span v-if="rate.autoSync && rate.syncError" class="badge bg-red-100 text-red-700 flex items-center gap-0.5" :title="rate.syncError">
                <ExclamationTriangleIcon class="h-2.5 w-2.5" />Error
              </span>
            </div>

            <!-- Estado -->
            <div class="col-span-2">
              <span class="badge" :class="rate.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                {{ rate.isActive ? 'Activa' : 'Inactiva' }}
              </span>
            </div>

            <!-- Acciones hover -->
            <div class="col-span-1 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button v-if="canManage && !rate.isDefault && rate.isActive" class="p-1.5 rounded-lg hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 transition-colors" title="Predeterminar" @click="$emit('set-default', rate)">
                <StarIcon class="h-3.5 w-3.5" />
              </button>
              <button v-if="canManage && !rate.isDefault" class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" :title="rate.isActive ? 'Desactivar' : 'Activar'" @click="$emit('toggle', rate)">
                <component :is="rate.isActive ? NoSymbolIcon : CheckCircleIcon" class="h-3.5 w-3.5" />
              </button>
              <button v-if="canManage && rate.code === 'VES' && rate.autoSync" class="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Sincronizar BCV" :disabled="syncingCode === rate.code" @click="$emit('sync', rate)">
                <ArrowPathIcon class="h-3.5 w-3.5" :class="{ 'animate-spin': syncingCode === rate.code }" />
              </button>
              <button class="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors" title="Historial de cambios" @click="$emit('open-history', rate)">
                <ClockIcon class="h-3.5 w-3.5" />
              </button>
              <button v-if="canManage" class="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" title="Editar" @click="$emit('edit', rate)">
                <PencilIcon class="h-3.5 w-3.5" />
              </button>
              <button v-if="canManage && !rate.isDefault" class="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Eliminar" @click="$emit('delete', rate)">
                <TrashIcon class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  CurrencyDollarIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, ArrowPathIcon,
  StarIcon, NoSymbolIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import type { ExchangeRate } from '~/composables/wallets/useExchangeRates'

defineProps<{
  rates: ExchangeRate[]
  loading: boolean
  showInactive: boolean
  search: string
  previewAmount: number
  canManage: boolean
  syncingCode: string | null
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string
}>()

defineEmits<{
  'update:showInactive': [value: boolean]
  'update:search': [value: string]
  'set-default': [rate: ExchangeRate]
  toggle: [rate: ExchangeRate]
  sync: [rate: ExchangeRate]
  'open-history': [rate: ExchangeRate]
  edit: [rate: ExchangeRate]
  delete: [rate: ExchangeRate]
}>()
</script>
