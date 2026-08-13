<template>
  <aside class="hidden lg:flex flex-col gap-4 w-60 flex-shrink-0 sticky top-[120px]">
    <div v-if="commerces.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
        </svg>
        Comercios
      </h3>
      <div class="space-y-0.5">
        <button
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors"
          :class="!activeCommerceId ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
          @click="$emit('clear-commerce')"
        >
          <span>Todos</span>
          <span class="opacity-60 text-[11px]">{{ total }}</span>
        </button>
        <button
          v-for="r in commerces" :key="r.id"
          class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors"
          :class="activeCommerceId === r.id ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
          @click="$emit('filter-by-commerce', r.id)"
        >
          <span class="truncate mr-2">{{ r.name }}</span>
          <span class="text-[11px] opacity-60 flex-shrink-0">{{ r.productCount }}</span>
        </button>
      </div>
    </div>
    <PriceRangeFilter
      :model-min="priceMin"
      :model-max="priceMax"
      accent="red"
      @apply="(min, max) => $emit('apply-price-range', min, max)"
    />
    <SortDropdown :model-value="selectedSort" :options="sortOptions" accent="red" @update:model-value="$emit('apply-sort', $event)" />
    <button
      v-if="activeCategory || activeCommerceId || searchInput"
      class="w-full text-xs font-semibold text-red-600 py-2.5 px-4 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
      @click="$emit('reset-filters')"
    >
      ✕ Limpiar filtros
    </button>
  </aside>
</template>

<script setup lang="ts">
import PriceRangeFilter from '~/components/search/PriceRangeFilter.vue'
import SortDropdown from '~/components/search/SortDropdown.vue'
import type { CatalogCommerce, CatalogSortBy } from '~/composables/catalog/useCatalog'

defineProps<{
  commerces: CatalogCommerce[]
  activeCommerceId: string | null
  activeCategory: string | null
  total: number
  priceMin: number | null
  priceMax: number | null
  selectedSort: CatalogSortBy
  sortOptions: { value: CatalogSortBy; label: string }[]
  searchInput: string
}>()

defineEmits<{
  'clear-commerce': []
  'filter-by-commerce': [id: string]
  'apply-price-range': [min: number | null, max: number | null]
  'apply-sort': [value: string]
  'reset-filters': []
}>()
</script>
