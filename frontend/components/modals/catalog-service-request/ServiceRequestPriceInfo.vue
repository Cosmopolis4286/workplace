<template>
  <div class="bg-blue-50 rounded-2xl px-4 py-3.5 space-y-2.5">
    <div class="flex items-center justify-between">
      <span class="text-xs font-bold text-blue-700">Precio base del servicio</span>
      <div class="text-right">
        <div>
          <span class="text-lg font-black text-blue-600">${{ formatPrice(service?.price ?? 0) }}</span>
          <span v-if="service?.priceUnit" class="text-xs text-blue-400 ml-1">/ {{ service.priceUnit }}</span>
        </div>
        <div v-if="convertedPrice && defaultRate" class="text-[11px] text-blue-400 mt-0.5">
          {{ defaultRate.symbol }} {{ convertedPrice.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          <span v-if="service?.priceUnit"> / {{ service.priceUnit }}</span>
        </div>
      </div>
    </div>

    <div class="h-px bg-blue-100" />

    <div class="flex items-start gap-2">
      <svg class="w-3.5 h-3.5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <p class="text-[11px] text-blue-600 leading-snug">
        Este es el precio publicado por el proveedor para <strong>{{ modalityLabel }}</strong>.
        El monto final se confirma con el proveedor según el alcance real del trabajo
        <span v-if="itemsCount">y los {{ itemsCount }} ítem{{ itemsCount === 1 ? '' : 's' }} solicitados</span>.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ExchangeRate } from '~/composables/wallets/useExchangeRates'

defineProps<{
  service: CatalogService | null
  convertedPrice: number | null
  defaultRate: ExchangeRate | null
  modalityLabel: string
  itemsCount: number
}>()

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}
</script>
