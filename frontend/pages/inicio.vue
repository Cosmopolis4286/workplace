<template>
  <div class="min-h-screen bg-gray-50">

    <!-- ─── HERO + BUSCADOR ─────────────────────────────────────────────── -->
    <div class="relative overflow-hidden bg-gradient-to-br from-ifood-red via-red-500 to-red-700 pt-8 pb-16 px-4 sm:px-6">
      <!-- Decorative blobs -->
      <div class="absolute -top-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      <div class="absolute -bottom-20 -left-10 w-72 h-72 bg-white/5 rounded-full blur-3xl" />

      <div class="relative max-w-2xl mx-auto text-center">
        <!-- Greeting -->
        <p class="text-red-100 text-sm font-medium mb-1">
          {{ greeting }}, <span class="font-bold text-white">{{ firstName }}</span> 👋
        </p>
        <h1 class="text-3xl sm:text-4xl font-black text-white mb-2 leading-tight">
          ¿Qué vas a pedir<br class="sm:hidden" /> hoy?
        </h1>
        <p class="text-red-100 text-sm mb-6">
          {{ total }} productos disponibles de {{ restaurants.length }} establecimientos
        </p>

        <!-- Search input -->
        <div class="relative group">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg
              class="w-5 h-5 transition-colors duration-200"
              :class="searchFocused ? 'text-ifood-red' : 'text-gray-400'"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            v-model="searchInput"
            type="text"
            placeholder="Busca productos, restaurantes, categorías..."
            class="w-full pl-12 pr-12 py-4 rounded-2xl text-gray-900 text-sm font-medium placeholder-gray-400 bg-white shadow-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/30 transition-all duration-200"
            @focus="searchFocused = true"
            @blur="searchFocused = false"
            @input="handleSearch"
          />
          <button
            v-if="searchInput"
            class="absolute inset-y-0 right-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            @click="clearSearch"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ─── CATEGORÍAS ──────────────────────────────────────────────────── -->
    <div class="-mt-6 px-4 sm:px-6 mb-6">
      <div class="max-w-6xl mx-auto">
        <div class="bg-white rounded-2xl shadow-lg p-4">
          <div
            v-if="loadingCategories"
            class="flex gap-3 overflow-x-auto pb-1 scrollbar-none"
          >
            <div
              v-for="i in 6" :key="i"
              class="flex-shrink-0 h-9 w-24 rounded-full bg-gray-100 animate-pulse"
            />
          </div>
          <div
            v-else
            class="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none"
          >
            <!-- "Todos" pill -->
            <button
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap"
              :class="!activeCategory
                ? 'bg-ifood-red text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="clearCategory"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Todos
            </button>

            <button
              v-for="cat in categories" :key="cat.id"
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap"
              :class="activeCategory === cat.name
                ? 'text-white shadow-md'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              :style="activeCategory === cat.name ? { backgroundColor: cat.color || '#ef4444' } : {}"
              @click="filterByCategory(cat.name)"
            >
              <span
                v-if="activeCategory !== cat.name"
                class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                :style="{ backgroundColor: cat.color || '#ef4444' }"
              />
              {{ cat.name }}
              <span class="opacity-60">({{ cat.productCount }})</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── MAIN CONTENT ───────────────────────────────────────────────── -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 pb-12">

      <!-- Toolbar: resultados + sort -->
      <div class="flex items-center justify-between mb-5">
        <div>
          <span v-if="!loading" class="text-sm text-gray-500">
            <span class="font-semibold text-gray-800">{{ total }}</span>
            {{ activeCategory ? `en "${activeCategory}"` : searchInput ? `resultados para "${searchInput}"` : 'productos disponibles' }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-xs text-gray-500 hidden sm:block">Ordenar:</label>
          <select
            v-model="selectedSort"
            class="text-xs font-medium border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-ifood-red/30 cursor-pointer"
            @change="handleSort"
          >
            <option value="relevance">Relevancia</option>
            <option value="price_asc">Menor precio</option>
            <option value="price_desc">Mayor precio</option>
            <option value="name">Nombre A-Z</option>
          </select>
        </div>
      </div>

      <!-- Skeleton loading -->
      <div v-if="loading" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <div
          v-for="i in 8" :key="i"
          class="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse"
        >
          <div class="aspect-[4/3] bg-gray-200" />
          <div class="p-3 space-y-2">
            <div class="h-3 bg-gray-200 rounded-full w-3/4" />
            <div class="h-3 bg-gray-100 rounded-full w-1/2" />
            <div class="h-6 bg-gray-200 rounded-xl w-1/3 mt-2" />
          </div>
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="error"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p class="text-gray-600 font-medium mb-2">Ocurrió un error</p>
        <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
        <button
          class="px-5 py-2 bg-ifood-red text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors"
          @click="loadProducts"
        >
          Reintentar
        </button>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="products.length === 0"
        class="flex flex-col items-center justify-center py-20 text-center"
      >
        <div class="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-5">
          <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p class="text-gray-700 font-semibold text-lg mb-1">Sin resultados</p>
        <p class="text-sm text-gray-400 mb-5 max-w-xs">
          No encontramos productos con los filtros actuales. Intenta con otra búsqueda.
        </p>
        <button
          class="px-5 py-2 bg-ifood-red text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors"
          @click="resetFilters"
        >
          Ver todos los productos
        </button>
      </div>

      <!-- Products grid -->
      <div
        v-else
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
      >
        <CatalogProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          @view="openProduct"
        />
      </div>

      <!-- Pagination -->
      <div
        v-if="!loading && totalPages > 1"
        class="flex items-center justify-center gap-2 mt-10"
      >
        <button
          :disabled="currentPage <= 1"
          class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          @click="changePage(currentPage - 1)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Anterior
        </button>

        <div class="flex items-center gap-1.5">
          <button
            v-for="p in visiblePages"
            :key="p"
            class="w-9 h-9 rounded-xl text-sm font-semibold transition-all"
            :class="p === currentPage
              ? 'bg-ifood-red text-white shadow-md'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'"
            @click="changePage(p)"
          >
            {{ p }}
          </button>
        </div>

        <button
          :disabled="currentPage >= totalPages"
          class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          @click="changePage(currentPage + 1)"
        >
          Siguiente
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- ─── PRODUCT DETAIL MODAL ───────────────────────────────────────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="selectedProduct"
          class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
          @click.self="selectedProduct = null"
        >
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="selectedProduct = null" />

          <Transition
            enter-active-class="duration-200 ease-out"
            enter-from-class="opacity-0 scale-95 translate-y-4"
            enter-to-class="opacity-100 scale-100 translate-y-0"
          >
            <div
              v-if="selectedProduct"
              class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              @click.stop
            >
              <!-- Image -->
              <div class="relative aspect-video bg-gray-100">
                <img
                  v-if="selectedProduct.image"
                  :src="selectedProduct.image"
                  :alt="selectedProduct.name"
                  class="w-full h-full object-cover"
                />
                <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <button
                  class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                  @click="selectedProduct = null"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <!-- Category badge -->
                <div class="absolute bottom-3 left-3">
                  <span
                    class="px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow"
                    :style="{ backgroundColor: selectedProduct.category?.color || '#ef4444' }"
                  >
                    {{ selectedProduct.category?.name }}
                  </span>
                </div>
              </div>

              <!-- Info -->
              <div class="p-5">
                <h2 class="text-xl font-black text-gray-900 mb-1">{{ selectedProduct.name }}</h2>
                <p v-if="selectedProduct.description" class="text-sm text-gray-500 mb-3">
                  {{ selectedProduct.description }}
                </p>

                <!-- Meta chips -->
                <div class="flex flex-wrap gap-2 mb-4">
                  <div class="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-xl">
                    <svg class="w-4 h-4 text-ifood-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                    </svg>
                    <span class="text-xs font-semibold text-ifood-red">{{ selectedProduct.restaurant?.name }}</span>
                  </div>
                  <div v-if="selectedProduct.preparationTime" class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span class="text-xs font-medium text-gray-600">{{ selectedProduct.preparationTime }} min</span>
                  </div>
                  <div v-if="selectedProduct.calories" class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-xl">
                    <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    </svg>
                    <span class="text-xs font-medium text-gray-600">{{ selectedProduct.calories }} kcal</span>
                  </div>
                </div>

                <!-- Price + action -->
                <div class="flex items-center justify-between border-t border-gray-100 pt-4">
                  <div>
                    <p class="text-xs text-gray-400 mb-0.5">Precio</p>
                    <p class="text-2xl font-black text-ifood-red">
                      ${{ formatPrice(selectedProduct.price) }}
                      <span v-if="selectedProduct.unit" class="text-sm font-normal text-gray-400">/ {{ selectedProduct.unit }}</span>
                    </p>
                  </div>
                  <button
                    class="flex items-center gap-2 px-5 py-2.5 bg-ifood-red text-white font-bold text-sm rounded-xl hover:bg-red-600 active:scale-95 transition-all shadow-lg shadow-red-200"
                    @click="selectedProduct = null"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    ¡Lo quiero!
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { CatalogProduct } from '~/composables/useCatalog'

definePageMeta({ layout: 'default' })

const { user } = useAuth()
const {
  products, categories, restaurants, loading, loadingCategories, error,
  total, totalPages, query,
  loadCategories, loadProducts, search,
  filterByCategory, changePage, changeSort, resetFilters,
} = useCatalog()

// ── Greeting ──────────────────────────────────────────────────────────────
const firstName = computed(() => user.value?.firstName ?? 'Usuario')
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
})

// ── UI state ──────────────────────────────────────────────────────────────
const searchInput = ref('')
const searchFocused = ref(false)
const selectedProduct = ref<CatalogProduct | null>(null)
const selectedSort = ref<'relevance' | 'price_asc' | 'price_desc' | 'name'>('relevance')

const activeCategory = computed(() => query.value.categoryName)
const currentPage = computed(() => query.value.page)

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: number[] = []
  const start = Math.max(1, current - 2)
  const end = Math.min(total, current + 2)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

// ── Handlers ──────────────────────────────────────────────────────────────
const handleSearch = () => search(searchInput.value)

const clearSearch = () => {
  searchInput.value = ''
  search('')
}

const clearCategory = () => {
  filterByCategory('')
}

const handleSort = () => changeSort(selectedSort.value)

const openProduct = (product: CatalogProduct) => {
  selectedProduct.value = product
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)

// ── Init ──────────────────────────────────────────────────────────────────
onMounted(async () => {
  await Promise.all([loadCategories(), loadProducts()])
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
