<template>
  <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
    leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
    <div v-if="product" class="fixed inset-0 z-[200] flex items-center justify-center p-4" @click.self="$emit('close')">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="$emit('close')" />
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0">
        <div v-if="product" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div class="relative aspect-[16/9] bg-gray-100 rounded-t-3xl overflow-hidden">
            <img v-if="product.image" :src="product.image" :alt="product.name" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
            </div>
            <div class="absolute top-3 left-3">
              <span class="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow" :style="{ backgroundColor: product.category.color }">{{ product.category.name }}</span>
            </div>
            <button class="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors" @click="$emit('close')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="p-5">
            <div class="flex items-start justify-between gap-3 mb-3">
              <h2 class="text-xl font-black text-gray-900 leading-tight">{{ product.name }}</h2>
              <div class="text-right flex-shrink-0">
                <span class="text-2xl font-black text-red-600">${{ formatPrice(product.price) }}</span>
                <div v-if="defaultRate && product.price" class="text-xs text-gray-500">
                  {{ defaultRate.symbol }} {{ formatNumber(product.price * defaultRate.rateToUsd, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </div>
              </div>
            </div>
            <p v-if="product.description" class="text-sm text-gray-500 mb-4 leading-relaxed">{{ product.description }}</p>
            <div class="flex flex-wrap gap-2 mb-4">
              <NuxtLink v-if="product.commerce.user?.username"
                :to="`/p/${product.commerce.user.username}`"
                class="flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors"
                @click="$emit('close')">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                {{ product.commerce.name }}
              </NuxtLink>
              <span v-else class="flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl">
                <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                {{ product.commerce.name }}
              </span>
              <span v-if="product.preparationTime" class="flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                {{ product.preparationTime }} min
              </span>
            </div>
            <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
              <button
                v-if="!isOwnProduct"
                class="flex-1 py-2.5 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-sm shadow-red-200"
                @click="$emit('order'); $emit('close')">
                ¡Lo quiero!
              </button>
              <span v-else class="flex-1 text-center text-sm font-semibold text-gray-400 py-2.5 bg-gray-100 rounded-xl">
                Este es tu producto
              </span>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useDateFormat } from '~/composables/core/useDateFormat'
import type { CatalogProduct } from '~/composables/catalog/useCatalog'
import type { ExchangeRate } from '~/composables/wallets/useExchangeRates'

defineProps<{
  product: CatalogProduct | null
  isOwnProduct: boolean
  defaultRate: ExchangeRate | null
}>()

defineEmits<{
  close: []
  order: []
}>()

const { formatNumber } = useDateFormat()
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}
</script>
