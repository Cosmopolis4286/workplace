<template>
  <div class="flex-1 min-w-0">
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-4 gap-3">
      <div>
        <p class="text-sm font-bold text-gray-800">
          <span v-if="loading">Buscando...</span>
          <span v-else><span class="text-red-600">{{ total }}</span> {{ total === 1 ? ' producto disponible' : ' productos disponibles' }}</span>
        </p>
        <p v-if="activeCategory || activeCommerceId" class="text-xs text-gray-400 mt-0.5">
          <span v-if="activeCategory">Categoría: <strong>{{ activeCategory }}</strong></span>
          <span v-if="activeCategory && activeCommerceId"> · </span>
          <span v-if="activeCommerceId">{{ commerces.find(r => r.id === activeCommerceId)?.name }}</span>
        </p>
      </div>
      <div class="lg:hidden">
        <select :value="selectedSort" class="text-xs font-medium border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none" @change="$emit('apply-sort', ($event.target as HTMLSelectElement).value)">
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </div>

    <ActiveFilterChips :chips="activeChips" accent="red" @clear-all="$emit('reset-filters')" />

    <TagChips endpoint="/catalog/tags" :model-value="activeTag" accent="red" @update:model-value="$emit('tag-click', $event)" />

    <div v-if="locationTierLabel" class="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">
      <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      {{ locationTierLabel }}
    </div>

    <RecentlyViewedStrip :items="recentlyViewedItems" accent="red" @open="$emit('open-recently-viewed', $event)" />

    <!-- Error -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
      <p class="text-sm font-semibold text-red-700 mb-3">{{ error }}</p>
      <button class="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl" @click="$emit('retry')">Reintentar</button>
    </div>

    <!-- Skeleton -->
    <div v-else-if="loading" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      <div v-for="n in 8" :key="n" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
        <div class="aspect-[4/3] bg-gray-200" />
        <div class="p-3 space-y-2">
          <div class="h-3 bg-gray-200 rounded w-3/4" />
          <div class="h-3 bg-gray-200 rounded w-1/2" />
          <div class="flex items-center justify-between mt-3">
            <div class="h-4 bg-gray-200 rounded w-16" />
            <div class="h-7 w-14 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <!-- Vacío -->
    <div v-else-if="visibleProducts.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
      <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path v-if="showFavoritesOnly" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
          <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
      <p class="text-base font-bold text-gray-800 mb-1">Sin resultados</p>
      <p class="text-sm text-gray-400 mb-6">
        <span v-if="showFavoritesOnly">Aún no tienes productos favoritos</span>
        <span v-else>{{ searchInput ? `No hay productos para "${searchInput}"` : 'No hay productos con estos filtros' }}</span>
      </p>
      <button v-if="showFavoritesOnly" class="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors" @click="$emit('update:show-favorites-only', false)">Ver todos los productos</button>
      <button v-else class="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors" @click="$emit('reset-filters')">Ver todos los productos</button>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      <CatalogProductCard
        v-for="product in visibleProducts" :key="product.id" :product="product"
        :isOwner="isOwnProduct(product)" :isFavorite="isFavorite(product.id)"
        @view="$emit('view-product', product)" @order="$emit('order-product', product)" @toggle-favorite="$emit('toggle-favorite', $event)"
        @toggle-status="$emit('toggle-product-status', $event)" @edit="$emit('edit-product', $event)" @delete="$emit('delete-product', $event)"
      />
    </div>

    <SearchPagination :current-page="currentPage" :total-pages="totalPages" accent="red" @change-page="$emit('change-page', $event)" />
  </div>
</template>

<script setup lang="ts">
import CatalogProductCard from '~/components/catalog/CatalogProductCard.vue'
import ActiveFilterChips from '~/components/search/ActiveFilterChips.vue'
import TagChips from '~/components/search/TagChips.vue'
import RecentlyViewedStrip from '~/components/search/RecentlyViewedStrip.vue'
import SearchPagination from '~/components/search/SearchPagination.vue'
import type { CatalogProduct, CatalogCommerce, CatalogSortBy } from '~/composables/catalog/useCatalog'
import type { FilterChip } from '~/composables/catalog/useCatalogFilters'
import type { RecentlyViewedItem } from '~/composables/search/useRecentlyViewed'

defineProps<{
  loading: boolean
  error: string | null
  total: number
  totalPages: number
  currentPage: number
  activeCategory: string | null
  activeCommerceId: string | null
  commerces: CatalogCommerce[]
  selectedSort: CatalogSortBy
  sortOptions: { value: CatalogSortBy; label: string }[]
  activeChips: FilterChip[]
  activeTag: string
  locationTierLabel: string | null
  recentlyViewedItems: RecentlyViewedItem[]
  visibleProducts: CatalogProduct[]
  showFavoritesOnly: boolean
  searchInput: string
  isOwnProduct: (product: CatalogProduct) => boolean
  isFavorite: (id: string) => boolean
}>()

defineEmits<{
  'apply-sort': [value: string]
  'reset-filters': []
  'tag-click': [tag: string]
  'open-recently-viewed': [item: RecentlyViewedItem]
  retry: []
  'update:show-favorites-only': [value: boolean]
  'view-product': [product: CatalogProduct]
  'order-product': [product: CatalogProduct]
  'toggle-favorite': [id: string]
  'change-page': [page: number]
  'toggle-product-status': [productId: string]
  'edit-product': [productId: string]
  'delete-product': [productId: string]
}>()
</script>
