<template>
  <div class="flex-1 min-w-0">
    <!-- Toolbar -->
    <div class="flex items-center justify-between mb-4 gap-3">
      <div>
        <p class="text-sm font-bold text-gray-800">
          <span v-if="loading">Buscando...</span>
          <span v-else><span class="text-blue-600">{{ total }}</span> {{ total === 1 ? ' servicio disponible' : ' servicios disponibles' }}</span>
        </p>
        <p v-if="activeCategoryId || activeProviderId" class="text-xs text-gray-400 mt-0.5">
          <span v-if="activeCategoryId">Categoría: <strong>{{ categories.find(c => c.id === activeCategoryId)?.name }}</strong></span>
          <span v-if="activeCategoryId && activeProviderId"> · </span>
          <span v-if="activeProviderId">{{ providers.find(p => p.id === activeProviderId)?.name }}</span>
        </p>
      </div>
      <div class="lg:hidden">
        <select :value="selectedSort" class="text-xs font-medium border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none" @change="$emit('apply-sort', ($event.target as HTMLSelectElement).value)">
          <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>
    </div>

    <TagChips endpoint="/services/catalog/tags" :model-value="activeTag" accent="blue" @update:model-value="$emit('tag-click', $event)" />

    <div v-if="locationTierLabel" class="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-4">
      <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
      {{ locationTierLabel }}
    </div>

    <RecentlyViewedStrip :items="recentlyViewedItems" accent="blue" @open="$emit('open-recently-viewed', $event)" />

    <!-- Error -->
    <div v-if="error" class="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
      <p class="text-sm font-semibold text-blue-700 mb-3">{{ error }}</p>
      <button class="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl" @click="$emit('retry')">Reintentar</button>
    </div>

    <!-- Skeleton -->
    <div v-else-if="loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="n in 6" :key="n" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
        <div class="aspect-video bg-gray-200" />
        <div class="p-4 space-y-2">
          <div class="h-4 bg-gray-200 rounded w-3/4" />
          <div class="h-3 bg-gray-200 rounded w-full" />
          <div class="h-3 bg-gray-200 rounded w-2/3" />
          <div class="flex items-center justify-between mt-3">
            <div class="h-5 bg-gray-200 rounded w-20" />
            <div class="h-8 w-24 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    </div>

    <!-- Vacío -->
    <div v-else-if="services.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
      <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      </div>
      <p class="text-base font-bold text-gray-800 mb-1">Sin servicios disponibles</p>
      <p class="text-sm text-gray-400 mb-6">{{ searchInput ? `No hay servicios para "${searchInput}"` : 'No hay servicios con estos filtros' }}</p>
      <button class="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors" @click="$emit('reset-filters')">Ver todos los servicios</button>
    </div>

    <!-- Grid servicios -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="srv in services"
        :key="srv.id"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        @click="$emit('view-service', srv)"
      >
        <!-- Imagen -->
        <div class="relative aspect-video bg-blue-50 overflow-hidden">
          <img v-if="srv.image" :src="imageSrc(srv.image)" :alt="srv.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div v-else class="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
            <svg class="w-12 h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <div v-if="srv.category" class="absolute top-2 left-2">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" :style="{ backgroundColor: srv.category.color || '#3B82F6' }">
              {{ srv.category.name }}
            </span>
          </div>
          <div v-if="isOwnService(srv)" class="absolute top-2 right-2">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-blue-600 border border-blue-200 shadow-sm flex items-center gap-1">
              <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/></svg>
              Mi servicio
            </span>
          </div>
        </div>

        <!-- Info -->
        <div class="p-4">
          <h3 class="font-bold text-gray-900 text-sm mb-1 line-clamp-1">{{ srv.name }}</h3>
          <p v-if="srv.description" class="text-xs text-gray-500 mb-3 line-clamp-2">{{ srv.description }}</p>

          <!-- Proveedor -->
          <div class="flex items-center gap-2 mb-3">
            <div class="w-6 h-6 rounded-full overflow-hidden bg-blue-100 flex-shrink-0">
              <img v-if="srv.user.avatar" :src="avatarSrc(srv.user.avatar)" :alt="srv.user.firstName" class="w-full h-full object-cover" />
              <span v-else class="w-full h-full flex items-center justify-center text-[10px] font-bold text-blue-600">
                {{ srv.user.firstName[0] }}{{ srv.user.lastName[0] }}
              </span>
            </div>
            <span class="text-xs text-gray-500 truncate">{{ srv.user.firstName }} {{ srv.user.lastName }}</span>
          </div>

          <!-- Rating del proveedor -->
          <div class="flex items-center gap-1 mb-3">
            <div class="flex items-center gap-0.5">
              <template v-for="n in 5" :key="n">
                <svg class="w-3 h-3" :class="n <= Math.round(srv.user.rating ?? 0) ? 'text-amber-400' : 'text-gray-200'" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </template>
            </div>
            <span v-if="srv.user.rating" class="text-[11px] font-semibold text-gray-600">{{ srv.user.rating.toFixed(1) }}</span>
            <span v-else class="text-[11px] text-gray-400">Sin reseñas</span>
            <span v-if="srv.user.reviewsCount > 0" class="text-[10px] text-gray-400">({{ srv.user.reviewsCount }})</span>
          </div>

          <!-- Tags -->
          <div v-if="srv.tags.length" class="flex flex-wrap gap-1 mb-3">
            <span v-for="tag in srv.tags.slice(0,3)" :key="tag" class="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{{ tag }}</span>
          </div>

          <!-- Precio y duración -->
          <div class="flex items-center justify-between">
            <div>
              <span class="text-lg font-black text-blue-600">${{ formatPrice(srv.price) }}</span>
              <span v-if="srv.priceUnit" class="text-xs text-gray-400 ml-1">/ {{ srv.priceUnit }}</span>
              <div v-if="defaultRate && srv.price" class="text-xs text-gray-500 mt-0.5">
                {{ defaultRate.symbol }} {{ formatNumber(srv.price * defaultRate.rateToUsd, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
              </div>
            </div>
            <div v-if="srv.duration" class="flex items-center gap-1 text-xs text-gray-400">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {{ srv.duration }} min
            </div>
          </div>
        </div>
      </div>
    </div>

    <SearchPagination :current-page="currentPage" :total-pages="totalPages" accent="blue" @change-page="$emit('change-page', $event)" />
  </div>
</template>

<script setup lang="ts">
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import { useDateFormat } from '~/composables/core/useDateFormat'
import TagChips from '~/components/search/TagChips.vue'
import RecentlyViewedStrip from '~/components/search/RecentlyViewedStrip.vue'
import SearchPagination from '~/components/search/SearchPagination.vue'
import type { CatalogService, ServiceCategory, ServiceProvider, ServiceSortBy } from '~/composables/services/useServices'
import type { RecentlyViewedItem } from '~/composables/search/useRecentlyViewed'
import type { ExchangeRate } from '~/composables/wallets/useExchangeRates'

defineProps<{
  loading: boolean
  error: string | null
  total: number
  totalPages: number
  currentPage: number
  activeCategoryId: string | null
  activeProviderId: string | null
  categories: ServiceCategory[]
  providers: ServiceProvider[]
  selectedSort: ServiceSortBy
  sortOptions: { value: ServiceSortBy; label: string }[]
  activeTag: string
  locationTierLabel: string | null
  recentlyViewedItems: RecentlyViewedItem[]
  services: CatalogService[]
  searchInput: string
  isOwnService: (srv: CatalogService) => boolean
  defaultRate: ExchangeRate | null
}>()

defineEmits<{
  'apply-sort': [value: string]
  'reset-filters': []
  'tag-click': [tag: string]
  'open-recently-viewed': [item: RecentlyViewedItem]
  retry: []
  'view-service': [srv: CatalogService]
  'change-page': [page: number]
}>()

const { getAssetUrl } = useAssetUrl()
const { formatNumber } = useDateFormat()
function avatarSrc(avatar: string) { return getAssetUrl(avatar) ?? '' }
function imageSrc(image: string) { return getAssetUrl(image) ?? '' }
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}
</script>
