<template>
  <div
    class="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col"
    @click="$emit('view', product)"
  >
    <!-- Image -->
    <div class="relative aspect-[4/3] bg-gray-100 overflow-hidden flex-shrink-0">
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        @error="imgError = true"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
      >
        <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4" />
        </svg>
      </div>

      <!-- Category badge -->
      <div class="absolute top-2 left-2">
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-white shadow-sm"
          :style="{ backgroundColor: product.category?.color || '#ef4444' }"
        >
          {{ product.category?.name }}
        </span>
      </div>

      <!-- Prep time pill -->
      <div v-if="product.preparationTime" class="absolute bottom-2 right-2">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-black/60 text-white backdrop-blur-sm">
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {{ product.preparationTime }}min
        </span>
      </div>
    </div>

    <!-- Content -->
    <div class="p-3 flex flex-col flex-1 gap-1.5">
      <!-- Name -->
      <h3 class="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 group-hover:text-ifood-red transition-colors">
        {{ product.name }}
      </h3>

      <!-- Description -->
      <p v-if="product.description" class="text-xs text-gray-500 line-clamp-1">
        {{ product.description }}
      </p>

      <!-- Restaurant -->
      <div class="flex items-center gap-1 text-xs text-gray-400">
        <svg class="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span class="truncate">{{ product.restaurant?.name }}</span>
      </div>

      <!-- Price + CTA -->
      <div class="flex items-center justify-between mt-auto pt-1.5 border-t border-gray-50">
        <div>
          <span class="text-lg font-black text-ifood-red">${{ formatPrice(product.price) }}</span>
          <span v-if="product.unit" class="text-xs text-gray-400 ml-0.5">/ {{ product.unit }}</span>
        </div>
        <button
          class="flex items-center gap-1 px-3 py-1.5 bg-ifood-red text-white text-xs font-semibold rounded-xl hover:bg-red-600 active:scale-95 transition-all duration-200 shadow-sm"
          @click.stop="$emit('view', product)"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Ver
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CatalogProduct } from '~/composables/useCatalog'

defineProps<{ product: CatalogProduct }>()
defineEmits<{ view: [product: CatalogProduct] }>()

const imgError = ref(false)

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
</script>
