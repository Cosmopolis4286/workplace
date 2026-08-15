<template>
  <Teleport to="body">
    <Transition enter-active-class="ease-out duration-200" enter-from-class="opacity-0" enter-to-class="opacity-100"
      leave-active-class="ease-in duration-150" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="rate" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
        <div class="absolute inset-0 bg-black/40" @click="$emit('close')" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
          <div class="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 class="text-base font-bold text-gray-900 flex items-center gap-2">
                <ClockIcon class="h-4.5 w-4.5 text-indigo-500" />
                Historial — {{ rate.code }}
              </h2>
              <p class="text-xs text-gray-400 mt-0.5">{{ rate.name }}</p>
            </div>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400" @click="$emit('close')"><XMarkIcon class="h-5 w-5" /></button>
          </div>

          <div class="p-6">
            <!-- Loading -->
            <div v-if="loading" class="space-y-3">
              <div v-for="i in 4" :key="i" class="skeleton h-14 rounded-xl" />
            </div>

            <!-- Vacío -->
            <div v-else-if="history.length === 0" class="text-center py-10">
              <ClockIcon class="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p class="text-sm text-gray-500">Sin cambios registrados todavía.</p>
            </div>

            <!-- Timeline -->
            <ol v-else class="relative border-l-2 border-gray-100 ml-2 space-y-5">
              <li v-for="entry in history" :key="entry.id" class="ml-4">
                <span
                  class="absolute -left-[7px] w-3 h-3 rounded-full ring-2 ring-white"
                  :class="entry.newRate > (entry.previousRate ?? 0) ? 'bg-green-500' : entry.newRate < (entry.previousRate ?? Infinity) ? 'bg-red-500' : 'bg-gray-300'"
                />
                <div class="flex items-center justify-between gap-2">
                  <p class="text-sm font-semibold text-gray-900">
                    <template v-if="entry.previousRate !== null">
                      {{ formatNumber(entry.previousRate, { maximumFractionDigits: 6 }) }}
                      <span class="text-gray-400 mx-1">→</span>
                    </template>
                    {{ formatNumber(entry.newRate, { maximumFractionDigits: 6 }) }}
                    <span class="text-gray-400 font-normal">{{ entry.code }}</span>
                  </p>
                  <span class="badge flex-shrink-0" :class="sourceBadgeClass(entry.source)">{{ sourceLabel(entry.source) }}</span>
                </div>
                <p class="text-xs text-gray-400 mt-0.5">
                  {{ formatDateTime(entry.createdAt) }}
                  <span v-if="entry.changedBy"> · por usuario {{ entry.changedBy.slice(0, 8) }}…</span>
                  <span v-else> · automático</span>
                </p>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ClockIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { ExchangeRate, ExchangeRateHistoryEntry } from '~/composables/wallets/useExchangeRates'

defineProps<{
  rate: ExchangeRate | null
  history: ExchangeRateHistoryEntry[]
  loading: boolean
  formatNumber: (value: number, opts?: Intl.NumberFormatOptions) => string
  formatDateTime: (date: string) => string
  sourceLabel: (source: string) => string
  sourceBadgeClass: (source: string) => string
}>()

defineEmits<{
  close: []
}>()
</script>
