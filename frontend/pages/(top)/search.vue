<template>
  <div class="min-h-screen bg-gray-50">

    <SearchHero
      :active-tab="activeTab"
      :active-tab-data="activeTabData"
      :search-tabs="searchTabs"
      :first-name="firstName"
      :hero-title="heroTitle"
      :greeting="greeting"
      :greeting-emoji="greetingEmoji"
      :display-count="displayCount"
      :display-groups="displayGroups"
      :search-input="searchInput"
      :show-suggestions="showSuggestions"
      :recent-searches-for-tab="recentSearchesForTab"
      @set-tab="setTab"
      @update:search-input="onSearchInputChange"
      @focus="handleSearchFocus"
      @blur="handleSearchBlur"
      @enter="handleSearchEnter"
      @clear="clearSearch"
      @apply-recent-search="applyRecentSearch"
      @remove-recent-search="removeRecentSearch"
    />

    <CategoryTabsBar
      :active-tab="activeTab"
      :can-propose-category="canProposeCategory"
      :p-active-category="pActiveCategory"
      :p-categories="pCategories"
      :p-loading-categories="pLoadingCategories"
      :p-favorites="pFavorites"
      :p-show-favorites-only="pShowFavoritesOnly"
      :s-active-category-id="sActiveCategoryId"
      :s-categories="sCategories"
      :s-loading-categories="sLoadingCategories"
      :j-active-category-id="jActiveCategoryId"
      :j-categories="jCategories"
      :j-loading-categories="jLoadingCategories"
      :suggested-job-category="suggestedJobCategory"
      :user-category-name="userCategoryName"
      :has-active-location-filter="hasActiveLocationFilter"
      :active-location-query="activeLocationQuery"
      @p-clear-category="pClearCategory"
      @update:p-show-favorites-only="pShowFavoritesOnly = $event"
      @p-filter-by-category="pFilterByCategory"
      @s-clear-category="sClearCategory"
      @s-filter-by-category="sFilterByCategory"
      @j-clear-category="jClearCategory"
      @j-filter-by-category="jFilterByCategory"
      @open-propose-category="proposeModalOpen = true"
      @apply-location="onLocationApply"
    />

    <!-- ─── CUERPO PRINCIPAL ────────────────────────────────────────────────── -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div class="flex gap-6 items-start">

        <ProductsSidebar
          v-if="activeTab === 'productos'"
          :commerces="pCommerces"
          :active-commerce-id="pActiveCommerceId"
          :active-category="pActiveCategory"
          :total="pTotal"
          :price-min="pQuery.priceMin"
          :price-max="pQuery.priceMax"
          :selected-sort="pSelectedSort"
          :sort-options="sortOptions"
          :search-input="searchInput"
          @clear-commerce="pClearCommerce"
          @filter-by-commerce="pFilterByCommerce"
          @apply-price-range="pApplyPriceRange"
          @apply-sort="pApplySort"
          @reset-filters="pResetFilters"
        />
        <ServicesSidebar
          v-else-if="activeTab === 'servicios'"
          :providers="sProviders"
          :active-provider-id="sActiveProviderId"
          :active-category-id="sActiveCategoryId"
          :total="sTotal"
          :selected-sort="sSelectedSort"
          :sort-options="serviceSortOptions"
          :search-input="searchInput"
          @clear-provider="sClearProvider"
          @filter-by-provider="sFilterByProvider"
          @apply-sort="sApplySort"
          @reset-filters="sResetFilters"
        />
        <JobsSidebar
          v-else-if="activeTab === 'empleos'"
          :active-category-id="jActiveCategoryId"
          :active-type="jActiveType"
          :active-modality="jActiveModality"
          :selected-sort="jSelectedSort"
          :sort-options="jobSortOptions"
          :search-input="searchInput"
          @clear-type="jClearType"
          @filter-by-type="jFilterByType"
          @clear-modality="jClearModality"
          @filter-by-modality="jFilterByModality"
          @apply-sort="jApplySort"
          @reset-filters="jResetFilters"
        />

        <ProductsResults
          v-if="activeTab === 'productos'"
          :loading="pLoading"
          :error="pError"
          :total="pTotal"
          :total-pages="pTotalPages"
          :current-page="pCurrentPage"
          :active-category="pActiveCategory"
          :active-commerce-id="pActiveCommerceId"
          :commerces="pCommerces"
          :selected-sort="pSelectedSort"
          :sort-options="sortOptions"
          :active-chips="pActiveChips"
          :active-tag="pActiveTag"
          :location-tier-label="pLocationTierLabel"
          :recently-viewed-items="recentlyViewedForTab"
          :visible-products="pVisibleProducts"
          :show-favorites-only="pShowFavoritesOnly"
          :search-input="searchInput"
          :is-own-product="isOwnProduct"
          :is-favorite="isFavorite"
          @apply-sort="pApplySort"
          @reset-filters="pResetFilters"
          @tag-click="tag => onTagClick('productos', tag)"
          @open-recently-viewed="openRecentlyViewed"
          @retry="pLoadProducts"
          @update:show-favorites-only="pShowFavoritesOnly = $event"
          @view-product="openProduct"
          @order-product="openOrderModal"
          @toggle-favorite="toggleFavorite"
          @change-page="pChangePage"
          @toggle-product-status="onToggleProductStatus"
          @edit-product="onEditProduct"
          @delete-product="onDeleteProduct"
        />
        <ServicesResults
          v-else-if="activeTab === 'servicios'"
          :loading="sLoading"
          :error="sError"
          :total="sTotal"
          :total-pages="sTotalPages"
          :current-page="sCurrentPage"
          :active-category-id="sActiveCategoryId"
          :active-provider-id="sActiveProviderId"
          :categories="sCategories"
          :providers="sProviders"
          :selected-sort="sSelectedSort"
          :sort-options="serviceSortOptions"
          :active-tag="sActiveTag"
          :location-tier-label="sLocationTierLabel"
          :recently-viewed-items="recentlyViewedForTab"
          :services="sServices"
          :search-input="searchInput"
          :is-own-service="isOwnService"
          :default-rate="defaultRate"
          @apply-sort="sApplySort"
          @reset-filters="sResetFilters"
          @tag-click="tag => onTagClick('servicios', tag)"
          @open-recently-viewed="openRecentlyViewed"
          @retry="sLoadServices"
          @view-service="openService"
          @change-page="sChangePage"
          @toggle-service-status="onToggleServiceStatus"
          @view-service-metrics="onViewServiceMetrics"
          @edit-service="onEditService"
          @delete-service="onDeleteService"
        />
        <JobsResults
          v-else-if="activeTab === 'empleos'"
          :loading="jLoading"
          :error="jError"
          :total="jTotal"
          :total-pages="jTotalPages"
          :current-page="jCurrentPage"
          :active-category-id="jActiveCategoryId"
          :active-type="jActiveType"
          :active-modality="jActiveModality"
          :categories="jCategories"
          :selected-sort="jSelectedSort"
          :sort-options="jobSortOptions"
          :active-tag="jActiveTag"
          :location-tier-label="jLocationTierLabel"
          :recently-viewed-items="recentlyViewedForTab"
          :jobs="jJobs"
          :search-input="searchInput"
          :is-own-job="isOwnJob"
          @apply-sort="jApplySort"
          @reset-filters="jResetFilters"
          @tag-click="tag => onTagClick('empleos', tag)"
          @open-recently-viewed="openRecentlyViewed"
          @retry="jLoadJobs"
          @view-job="openJob"
          @change-page="jChangePage"
          @toggle-job-status="onToggleJobStatus"
          @edit-job="onEditJob"
          @delete-job="onDeleteJob"
        />

      </div>
    </div>

    <!-- ─── Scroll to top ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="duration-200 ease-out" enter-from-class="opacity-0 scale-75" enter-to-class="opacity-100 scale-100"
        leave-active-class="duration-150 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-75">
        <button v-if="showScrollTop"
          class="fixed bottom-8 right-8 z-[150] w-11 h-11 rounded-2xl bg-white shadow-xl border border-gray-100 flex items-center justify-center text-gray-600 hover:text-white hover:border-transparent transition-all duration-200 active:scale-90"
          :class="activeTab === 'productos' ? 'hover:bg-red-600' : activeTab === 'servicios' ? 'hover:bg-blue-600' : 'hover:bg-emerald-600'"
          @click="scrollToTop">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
          </svg>
        </button>
      </Transition>

      <ProductDetailModal
        :product="selectedProduct"
        :is-own-product="selectedProduct ? isOwnProduct(selectedProduct) : false"
        :default-rate="defaultRate"
        @close="selectedProduct = null"
        @order="selectedProduct && openOrderModal(selectedProduct)"
      />

      <ServiceDetailModal
        :service="selectedService"
        :is-own-service="selectedService ? isOwnService(selectedService) : false"
        :default-rate="defaultRate"
        @close="selectedService = null"
        @request="selectedService && openServiceRequestModal(selectedService)"
        @profile-visit="selectedService && trackProfileVisit(selectedService)"
        @report="reportingService = selectedService"
      />

      <JobDetailModal :job="selectedJob" @close="selectedJob = null" />

      <!-- Modal pedido individual -->
      <CatalogOrderModal v-model="showOrderModal" :product="orderProduct" @success="onOrderSuccess" />

      <!-- Modal solicitud de servicio -->
      <CatalogServiceRequestModal v-model="showServiceRequestModal" :service="serviceRequestTarget" @success="onServiceRequestSuccess" />

      <!-- Modal proponer categoría -->
      <ProposeCategoryModal :is-open="proposeModalOpen" :target="proposeCategoryTarget" @close="proposeModalOpen = false" @success="onProposeCategorySuccess" />

      <!-- Carrito drawer (solo en tab productos) -->
      <CartDrawer v-if="activeTab === 'productos'" />

      <!-- Botón flotante carrito (solo en tab productos) -->
      <Transition
        enter-active-class="duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-90"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-4 scale-90"
      >
        <button
          v-if="activeTab === 'productos' && cartTotalItems > 0"
          class="fixed bottom-6 right-6 z-[350] flex items-center gap-3 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-sm px-5 py-3.5 rounded-2xl shadow-xl shadow-red-300 transition-all duration-200"
          @click="openCart"
        >
          <!-- Icono carrito -->
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>
          <span>Ver carrito</span>
          <!-- Badge cantidad -->
          <span class="bg-white text-red-600 text-xs font-black w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
            {{ cartTotalItems > 99 ? '99+' : cartTotalItems }}
          </span>
          <!-- Precio total -->
          <span class="border-l border-red-400/60 pl-3 text-red-100 font-semibold text-xs">
            ${{ formatPrice(cartTotalPrice) }}
          </span>
        </button>
      </Transition>

      <!-- Toast éxito pedido -->
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="orderToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          ¡Pedido enviado! El comercio se pondrá en contacto contigo.
        </div>
      </Transition>

      <!-- Toast éxito solicitud de servicio -->
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="serviceToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-blue-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          ¡Solicitud enviada! El proveedor se pondrá en contacto contigo.
        </div>
      </Transition>

      <!-- Toast éxito propuesta de categoría -->
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="categoryProposalToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-gray-800 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          ¡Propuesta enviada! Un administrador la revisará pronto.
        </div>
      </Transition>
    </Teleport>

    <ReportProblemModal
      v-if="reportingService"
      :model-value="true"
      entity-type="SERVICE"
      :entity-id="reportingService.id"
      @update:model-value="reportingService = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CatalogProduct, CatalogSortBy } from '~/composables/catalog/useCatalog'
import type { CatalogService, ServiceSortBy } from '~/composables/services/useServices'
import type { Job, JobSortBy } from '~/composables/jobs/useJobs'
import { useJobs } from '~/composables/jobs/useJobs'
import { useExchangeRates } from '~/composables/wallets/useExchangeRates'
import { useCart } from '~/composables/catalog/useCart'
import { useSearchTabs } from '~/composables/search/useSearchTabs'
import { useCatalogFilters } from '~/composables/catalog/useCatalogFilters'
import { useRecentSearches } from '~/composables/search/useRecentSearches'
import { useRecentlyViewed, type RecentlyViewedItem } from '~/composables/search/useRecentlyViewed'
import { useAnimatedCounter } from '~/composables/search/useAnimatedCounter'
import { useMyServices } from '~/composables/services/useMyServices'
import { useMenu } from '~/composables/catalog/useMenu'
import { useConfirm } from '~/composables/ui/useConfirm'
import SearchHero from '~/components/search/SearchHero.vue'
import CategoryTabsBar from '~/components/search/CategoryTabsBar.vue'
import ProductsSidebar from '~/components/search/ProductsSidebar.vue'
import ServicesSidebar from '~/components/search/ServicesSidebar.vue'
import JobsSidebar from '~/components/search/JobsSidebar.vue'
import ProductsResults from '~/components/search/ProductsResults.vue'
import ServicesResults from '~/components/search/ServicesResults.vue'
import JobsResults from '~/components/search/JobsResults.vue'
import ProductDetailModal from '~/components/search/ProductDetailModal.vue'
import ServiceDetailModal from '~/components/search/ServiceDetailModal.vue'
import JobDetailModal from '~/components/search/JobDetailModal.vue'
import ReportProblemModal from '~/components/modals/ReportProblemModal.vue'

definePageMeta({ layout: 'default' })

// ─── Carrito ──────────────────────────────────────────────────────────────────
const { totalItems: cartTotalItems, totalPrice: cartTotalPrice, openCart } = useCart()

// ─── Productos ────────────────────────────────────────────────────────────────
const {
  products: pProducts, categories: pCategories, commerces: pCommerces,
  loading: pLoading, loadingCategories: pLoadingCategories,
  error: pError, total: pTotal, totalPages: pTotalPages, query: pQuery,
  locationTier: pLocationTier,
  loadCategories: pLoadCategories, loadCommerces: pLoadCommerces, loadProducts: pLoadProducts,
  search: pSearch, filterByCategory: pFilterByCategory, filterByCommerce: pFilterByCommerce,
  filterByPriceRange: pFilterByPriceRange,
  changePage: pChangePage, changeSort: pChangeSort, resetFilters: pResetFilters,
  filterByLocation: pFilterByLocation,
  toggleFavorite, isFavorite, favorites: pFavorites,
} = useCatalog()

// ─── Servicios ────────────────────────────────────────────────────────────────
const {
  services: sServices, categories: sCategories, providers: sProviders,
  loading: sLoading, loadingCategories: sLoadingCategories,
  error: sError, total: sTotal, totalPages: sTotalPages, query: sQuery,
  locationTier: sLocationTier,
  loadCategories: sLoadCategories, loadProviders: sLoadProviders, loadServices: sLoadServices,
  search: sSearch, filterByCategory: sFilterByCategory, filterByProvider: sFilterByProvider,
  changePage: sChangePage, changeSort: sChangeSort, resetFilters: sResetFilters,
  filterByLocation: sFilterByLocation,
  trackServiceEvent,
} = useServices()

// ─── Empleos ──────────────────────────────────────────────────────────────────
const {
  jobs: jJobs, categories: jCategories,
  loading: jLoading, loadingCategories: jLoadingCategories,
  error: jError, total: jTotal, totalPages: jTotalPages, query: jQuery,
  locationTier: jLocationTier,
  loadCategories: jLoadCategories, loadJobs: jLoadJobs,
  search: jSearch, filterByCategory: jFilterByCategory,
  filterByType: jFilterByType, filterByModality: jFilterByModality,
  changePage: jChangePage, changeSort: jChangeSort, resetFilters: jResetFilters,
  filterByLocation: jFilterByLocation,
} = useJobs()

const { user } = useAuth()

// Obtener tasa de cambio para conversión
const { defaultRate, fetchRates } = useExchangeRates()

// ─── Gestión de publicaciones propias (pausar/eliminar inline, editar redirige) ─
const { toggleStatus: toggleServiceStatus, deleteService } = useMyServices()
const { toggleProductStatus, deleteProduct } = useMenu()
const { updateJob: updateJobStatus, deleteJob } = useJobs()
const { confirm } = useConfirm()

// ─── Search Tabs (dynamic from API) ──────────────────────────────────────────
const { tabs: searchTabs, loadTabs: loadSearchTabs } = useSearchTabs()

// ─── Estado local ─────────────────────────────────────────────────────────────
const route = useRoute()
const router = useRouter()
const initialized = ref(false)
const activeTab = ref<string>('productos')
const searchInput = ref('')
const searchFocused = ref(false)
const selectedProduct = ref<CatalogProduct | null>(null)
const selectedService = ref<CatalogService | null>(null)
const reportingService = ref<CatalogService | null>(null)
const selectedJob = ref<Job | null>(null)
const showScrollTop = ref(false)
const showOrderModal = ref(false)
const orderProduct = ref<CatalogProduct | null>(null)
const orderToast = ref(false)
const showServiceRequestModal = ref(false)
const serviceRequestTarget = ref<CatalogService | null>(null)
const serviceToast = ref(false)
const pShowFavoritesOnly = ref(false)
const proposeModalOpen = ref(false)
const categoryProposalToast = ref(false)

const pSelectedSort = ref<CatalogSortBy>('relevance')
const sSelectedSort = ref<ServiceSortBy>('relevance')
const jSelectedSort = ref<JobSortBy>('relevance')

const sortOptions: { value: CatalogSortBy; label: string }[] = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'name', label: 'Nombre A-Z' },
  { value: 'rating_desc', label: 'Mejor calificados' },
  { value: 'best_seller', label: 'Más vendidos' },
]
const serviceSortOptions: { value: ServiceSortBy; label: string }[] = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'name', label: 'Nombre A-Z' },
]
const jobSortOptions: { value: JobSortBy; label: string }[] = [
  { value: 'relevance', label: 'Relevancia' },
  { value: 'newest', label: 'Más recientes' },
  { value: 'salary_asc', label: 'Menor salario' },
  { value: 'salary_desc', label: 'Mayor salario' },
]

// ─── Filtros activos (chips) ───────────────────────────────────────────────────
const { activeChips: pActiveChips } = useCatalogFilters({
  query: pQuery,
  categories: pCategories,
  commerces: pCommerces,
  searchInput,
  filterByCategory: pFilterByCategory,
  filterByCommerce: pFilterByCommerce,
  filterByPriceRange: pFilterByPriceRange,
  filterByLocation: pFilterByLocation,
  search: pSearch,
})

// ─── Zona (selector país/estado/ciudad) ────────────────────────────────────────
const activeLocationQuery = computed(() => {
  if (activeTab.value === 'productos') return { country: pQuery.value.country, state: pQuery.value.state, city: pQuery.value.city }
  if (activeTab.value === 'servicios') return { country: sQuery.value.country, state: sQuery.value.state, city: sQuery.value.city }
  return { country: jQuery.value.country, state: jQuery.value.state, city: jQuery.value.city }
})

const hasActiveLocationFilter = computed(() => {
  const q = activeLocationQuery.value
  return !!(q.country || q.state || q.city)
})

function onLocationApply(country: string, state: string, city: string) {
  if (activeTab.value === 'productos') pFilterByLocation(country, state, city)
  else if (activeTab.value === 'servicios') sFilterByLocation(country, state, city)
  else jFilterByLocation(country, state, city)
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const firstName = computed(() => user.value?.firstName || 'Usuario')

const activeTabData = computed(() =>
  searchTabs.value.find(t => t.key === activeTab.value) ?? null,
)

const canProposeCategory = computed(() => user.value?.role === 'PROFESIONAL')
const proposeCategoryTarget = computed<'PRODUCTO' | 'SERVICIO' | 'EMPLEO'>(() => {
  if (activeTab.value === 'productos') return 'PRODUCTO'
  if (activeTab.value === 'servicios') return 'SERVICIO'
  return 'EMPLEO'
})
function onProposeCategorySuccess() {
  categoryProposalToast.value = true
  setTimeout(() => { categoryProposalToast.value = false }, 4000)
}

const heroTitle = computed(() => {
  if (activeTab.value === 'productos') return '¿Qué vas a pedir hoy?'
  if (activeTab.value === 'servicios') return '¿Qué servicio necesitas?'
  if (activeTab.value === 'empleos') return '¿Buscas trabajo?'
  return activeTabData.value ? `Busca ${activeTabData.value.label.toLowerCase()}` : '¿Qué buscas hoy?'
})

const pCurrentPage = computed(() => pQuery.value.page)
const pActiveCategory = computed(() => pQuery.value.categoryName)
const pActiveCommerceId = computed(() => pQuery.value.commerceId)
const sCurrentPage = computed(() => sQuery.value.page)
const sActiveCategoryId = computed(() => sQuery.value.categoryId)
const sActiveProviderId = computed(() => sQuery.value.userId)
const jCurrentPage = computed(() => jQuery.value.page)
const jActiveCategoryId = computed(() => jQuery.value.categoryId)
const jActiveType = computed(() => jQuery.value.type)
const jActiveModality = computed(() => jQuery.value.modality)

// ─── Zona / Cerca de mí ─────────────────────────────────────────────────────
function locationTierLabel(
  tier: 'city' | 'state' | 'country' | null | undefined,
  loc: { city: string; state: string; country: string },
): string | null {
  if (tier === 'city') return `Mostrando resultados en ${loc.city}`
  if (tier === 'state') return `Sin resultados en esa ciudad. Mostrando resultados en ${loc.state}`
  if (tier === 'country') return `Sin resultados en esa zona. Mostrando resultados en ${loc.country}`
  return null
}
const pLocationTierLabel = computed(() => {
  const q = pQuery.value
  if (!q.nearMe && !q.country && !q.state && !q.city) return null
  const loc = q.nearMe ? { city: user.value?.city ?? '', state: user.value?.state ?? '', country: user.value?.country ?? '' } : q
  return locationTierLabel(pLocationTier.value, loc)
})
const sLocationTierLabel = computed(() => {
  const q = sQuery.value
  if (!q.nearMe && !q.country && !q.state && !q.city) return null
  const loc = q.nearMe ? { city: user.value?.city ?? '', state: user.value?.state ?? '', country: user.value?.country ?? '' } : q
  return locationTierLabel(sLocationTier.value, loc)
})
const jLocationTierLabel = computed(() => {
  const q = jQuery.value
  if (!q.nearMe && !q.country && !q.state && !q.city) return null
  const loc = q.nearMe ? { city: user.value?.city ?? '', state: user.value?.state ?? '', country: user.value?.country ?? '' } : q
  return locationTierLabel(jLocationTier.value, loc)
})

// ─── Sugerencia de categoría según rubro del usuario ──────────────────────────
const userCategoryName = computed(() => user.value?.category?.name ?? null)
const suggestedJobCategory = computed(() => {
  const name = userCategoryName.value
  if (!name) return null
  return jCategories.value.find(c => c.name.toLowerCase() === name.toLowerCase()) ?? null
})

// ─── Favoritos ────────────────────────────────────────────────────────────────
const pVisibleProducts = computed(() => {
  if (!pShowFavoritesOnly.value) return pProducts.value
  return pProducts.value.filter(p => pFavorites.value.includes(p.id))
})

// ─── Búsquedas recientes ────────────────────────────────────────────────────────
const { recentSearchesForTab, addRecentSearch, removeRecentSearch } = useRecentSearches(activeTab)

function applyRecentSearch(term: string) {
  searchInput.value = term
  searchFocused.value = false
  if (activeTab.value === 'productos') pSearch(term)
  else if (activeTab.value === 'servicios') sSearch(term)
  else jSearch(term)
  addRecentSearch(term)
}

// ─── Vistos recientemente ───────────────────────────────────────────────────────
const { recentlyViewedForTab, addRecentlyViewed } = useRecentlyViewed(activeTab)

function openRecentlyViewed(item: RecentlyViewedItem) {
  if (item.type === 'producto') {
    const product = pProducts.value.find(p => p.id === item.id)
    if (product) openProduct(product)
  } else if (item.type === 'servicio') {
    const srv = sServices.value.find(s => s.id === item.id)
    if (srv) openService(srv)
  } else {
    const job = jJobs.value.find(j => j.id === item.id)
    if (job) openJob(job)
  }
}

// ─── Hero: contadores animados + saludo ──────────────────────────────────────
const { value: displayCount, animateTo: animateCount } = useAnimatedCounter()
const { value: displayGroups, animateTo: animateGroups } = useAnimatedCounter()

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
})
const greetingEmoji = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return '☀️'
  if (h < 19) return '🌤️'
  return '🌙'
})

watch([activeTab, pTotal, sTotal, jTotal, () => pCommerces.value.length, () => sProviders.value.length], () => {
  if (activeTab.value === 'productos') {
    animateCount(pTotal.value)
    animateGroups(pCommerces.value.length)
  } else if (activeTab.value === 'servicios') {
    animateCount(sTotal.value)
    animateGroups(sProviders.value.length)
  } else {
    animateCount(jTotal.value)
    animateGroups(jJobs.value.length > 0 ? [...new Set(jJobs.value.map(j => j.employer.id))].length : 0)
  }
}, { immediate: true })

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function setTab(tab: string) {
  activeTab.value = tab
  searchInput.value = ''
}

function onSearchInputChange(value: string) {
  searchInput.value = value
  if (activeTab.value === 'productos') pSearch(value)
  else if (activeTab.value === 'servicios') sSearch(value)
  else jSearch(value)
}

// Click en un chip de tag popular: reusa la misma barra de búsqueda de texto
// (el backend ya matchea tags como parte del OR de búsqueda), así que
// clickear un tag es equivalente a escribirlo. Click de nuevo lo deselecciona.
const pActiveTag = computed(() => pQuery.value.search)
const sActiveTag = computed(() => sQuery.value.search)
const jActiveTag = computed(() => jQuery.value.search)

function onTagClick(tab: 'productos' | 'servicios' | 'empleos', tag: string) {
  searchInput.value = tag
  if (tab === 'productos') pSearch(tag)
  else if (tab === 'servicios') sSearch(tag)
  else jSearch(tag)
}

function clearSearch() {
  searchInput.value = ''
  if (activeTab.value === 'productos') pSearch('')
  else if (activeTab.value === 'servicios') sSearch('')
  else jSearch('')
}

function handleSearchFocus() {
  searchFocused.value = true
}

function handleSearchBlur() {
  // pequeño delay para permitir el click en una sugerencia
  setTimeout(() => { searchFocused.value = false }, 150)
  if (searchInput.value.trim()) addRecentSearch(searchInput.value)
}

function handleSearchEnter() {
  if (searchInput.value.trim()) addRecentSearch(searchInput.value)
  searchFocused.value = false
}

const showSuggestions = computed(() =>
  searchFocused.value && !searchInput.value && recentSearchesForTab.value.length > 0,
)

function pClearCategory() { if (pActiveCategory.value) pFilterByCategory(pActiveCategory.value) }
function pClearCommerce() { if (pActiveCommerceId.value) pFilterByCommerce(pActiveCommerceId.value) }
function pApplySort(val: string) { pSelectedSort.value = val as CatalogSortBy; pChangeSort(val as CatalogSortBy) }
function pApplyPriceRange(min: number | null, max: number | null) { pFilterByPriceRange(min, max) }

function sClearCategory() { sFilterByCategory(null) }
function sClearProvider() { sFilterByProvider(null) }
function sApplySort(val: string) { sSelectedSort.value = val as ServiceSortBy; sChangeSort(val as ServiceSortBy) }
function jClearCategory() { jFilterByCategory(null) }
function jClearType() { jFilterByType(null) }
function jClearModality() { jFilterByModality(null) }
function jApplySort(val: string) { jSelectedSort.value = val as JobSortBy; jChangeSort(val as JobSortBy) }

// Un COMMERCE no puede pedir sus propios productos; un FREELANCER/COMMERCE no puede contratar sus propios servicios
function isOwnProduct(product: CatalogProduct): boolean {
  const u = user.value
  if (!u || !u.commerce) return false
  return u.commerce.id === product.commerce.id
}

function isOwnService(srv: CatalogService): boolean {
  const u = user.value
  if (!u) return false
  return u.id === srv.user.id
}

function isOwnJob(job: Job): boolean {
  const u = user.value
  if (!u) return false
  return u.id === job.employer.id
}

// ─── Acciones de dueño (pausar/eliminar inline, editar redirige a la página de gestión) ─
async function onToggleProductStatus(productId: string) {
  await toggleProductStatus(productId)
}
async function onEditProduct(productId: string) {
  await router.push({ path: '/menu', query: { edit: productId } })
}
async function onDeleteProduct(productId: string) {
  await confirm({
    title: 'Eliminar producto',
    message: '¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.',
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await deleteProduct(productId)
        pLoadProducts()
      } catch (e: any) {
        return e?.message ?? 'Error al eliminar'
      }
    },
  })
}

async function onToggleServiceStatus(srv: CatalogService) {
  await confirm({
    title: srv.status === 'ACTIVE' ? 'Pausar servicio' : 'Activar servicio',
    message: `¿Estás seguro de que deseas ${srv.status === 'ACTIVE' ? 'pausar' : 'activar'} el servicio ${srv.name}?`,
    confirmText: srv.status === 'ACTIVE' ? 'Pausar' : 'Activar',
    onConfirm: async () => {
      try {
        await toggleServiceStatus(srv.id)
        sLoadServices()
      } catch (e: any) {
        return e?.message ?? 'Error al cambiar estado'
      }
    },
  })
}
async function onEditService(srv: CatalogService) {
  await router.push({ path: '/my-services', query: { edit: srv.id } })
}
async function onViewServiceMetrics(srv: CatalogService) {
  await router.push({ path: '/my-services', query: { metrics: srv.id } })
}
async function onDeleteService(srv: CatalogService) {
  await confirm({
    title: 'Eliminar servicio',
    message: `¿Estás seguro de eliminar ${srv.name}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await deleteService(srv.id)
        sLoadServices()
      } catch (e: any) {
        return e?.message ?? 'Error al eliminar'
      }
    },
  })
}

async function onToggleJobStatus(job: Job) {
  await confirm({
    title: job.status === 'ACTIVE' ? 'Pausar empleo' : 'Activar empleo',
    message: `¿Estás seguro de que deseas ${job.status === 'ACTIVE' ? 'pausar' : 'activar'} el empleo ${job.title}?`,
    confirmText: job.status === 'ACTIVE' ? 'Pausar' : 'Activar',
    onConfirm: async () => {
      try {
        await updateJobStatus(job.id, { status: job.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' })
        jLoadJobs()
      } catch (e: any) {
        return e?.message ?? 'Error al cambiar estado'
      }
    },
  })
}
async function onEditJob(job: Job) {
  await router.push({ path: '/jobs', query: { edit: job.id } })
}
async function onDeleteJob(job: Job) {
  await confirm({
    title: 'Eliminar empleo',
    message: `¿Estás seguro de eliminar ${job.title}? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
    onConfirm: async () => {
      try {
        await deleteJob(job.id)
        jLoadJobs()
      } catch (e: any) {
        return e?.message ?? 'Error al eliminar'
      }
    },
  })
}

function openProduct(product: CatalogProduct) {
  selectedProduct.value = product
  addRecentlyViewed({
    type: 'producto',
    id: product.id,
    name: product.name,
    image: product.image,
    subtitle: product.commerce?.name,
    price: product.price,
  })
}
function openService(srv: CatalogService) {
  selectedService.value = srv
  if (!isOwnService(srv)) {
    trackServiceEvent(srv.id, 'VIEW')
  }
  addRecentlyViewed({
    type: 'servicio',
    id: srv.id,
    name: srv.name,
    image: srv.images?.[0] ?? null,
    subtitle: `${srv.user.firstName} ${srv.user.lastName}`,
    price: srv.price,
  })
}
function openJob(job: Job) {
  selectedJob.value = job
  addRecentlyViewed({
    type: 'empleo',
    id: job.id,
    name: job.title,
    subtitle: `${job.employer.firstName} ${job.employer.lastName}`,
    price: job.salaryMax ?? job.salaryMin ?? null,
  })
}
function openOrderModal(product: CatalogProduct) { orderProduct.value = product; showOrderModal.value = true; selectedProduct.value = null }
function onOrderSuccess() {
  orderToast.value = true
  setTimeout(() => { orderToast.value = false }, 4000)
}
function openServiceRequestModal(srv: CatalogService) {
  serviceRequestTarget.value = srv
  selectedService.value = null
  showServiceRequestModal.value = true
}
function onServiceRequestSuccess() {
  serviceToast.value = true
  setTimeout(() => { serviceToast.value = false }, 4000)
  // Trackear REQUEST (evento ya guardado como ServiceRequest en BD, pero registramos el evento también)
  if (serviceRequestTarget.value && !isOwnService(serviceRequestTarget.value)) {
    trackServiceEvent(serviceRequestTarget.value.id, 'REQUEST')
  }
}
function trackProfileVisit(srv: CatalogService) {
  if (!isOwnService(srv)) {
    trackServiceEvent(srv.id, 'PROFILE_VISIT')
  }
}

function handleScroll() { showScrollTop.value = window.scrollY > 400 }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  await Promise.all([
    loadSearchTabs(),
    pLoadCategories(), pLoadCommerces(), pLoadProducts(),
    sLoadCategories(), sLoadProviders(), sLoadServices(),
    jLoadCategories(), jLoadJobs(),
    fetchRates(false, true),
  ])
  // Tab/búsqueda inicial desde query params (ej. al venir del buscador global)
  const tabFromQuery = typeof route.query.tab === 'string' ? route.query.tab : null
  const qFromQuery = typeof route.query.q === 'string' ? route.query.q : null

  if (tabFromQuery && searchTabs.value.some(t => t.key === tabFromQuery)) {
    activeTab.value = tabFromQuery
  } else if (searchTabs.value.length > 0) {
    // Set initial tab to first enabled tab from API (if loaded)
    activeTab.value = searchTabs.value[0].key
  }

  if (qFromQuery) {
    onSearchInputChange(qFromQuery)
  }

  initialized.value = true
})

// Sincroniza tab + término de búsqueda en la URL para permitir compartir/refrescar
watch([activeTab, searchInput], ([tab, q]) => {
  if (!initialized.value) return
  router.replace({ query: { ...route.query, tab, q: q || undefined } })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>
