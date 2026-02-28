<template>
  <div class="min-h-screen bg-gray-50">

    <!-- ─── HERO ──────────────────────────────────────────────────────────── -->
    <div class="relative overflow-hidden bg-gradient-to-br from-red-600 via-red-500 to-orange-500 px-4 py-10 sm:py-14">
      <div class="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      <div class="absolute -bottom-20 -left-10 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />
      <div class="absolute top-8 right-1/3 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

      <div class="relative max-w-2xl mx-auto text-center">
        <p class="text-red-100 text-sm font-medium mb-1">
          {{ greeting }}, <strong class="text-white">{{ firstName }}</strong> {{ greetingEmoji }}
        </p>
        <h1 class="text-3xl sm:text-4xl font-black text-white mb-6 leading-tight">
          ¿Qué vas a pedir hoy?
        </h1>

        <!-- Stats animadas -->
        <div class="flex items-center justify-center gap-3 mb-6">
          <div class="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5">
            <div class="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </div>
            <div class="text-left">
              <p class="text-white font-black text-xl leading-none">{{ displayTotal }}</p>
              <p class="text-red-100 text-[11px] leading-none mt-0.5">productos</p>
            </div>
          </div>
          <div class="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5">
            <div class="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
              </svg>
            </div>
            <div class="text-left">
              <p class="text-white font-black text-xl leading-none">{{ displayRestaurants }}</p>
              <p class="text-red-100 text-[11px] leading-none mt-0.5">restaurantes</p>
            </div>
          </div>
        </div>

        <!-- Buscador -->
        <div class="relative max-w-xl mx-auto">
          <div class="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <input
            v-model="searchInput"
            type="text"
            placeholder="Busca productos, restaurantes, categorías..."
            class="w-full pl-12 pr-10 py-4 rounded-2xl text-sm text-gray-900 bg-white
                   shadow-lg placeholder-gray-400 outline-none
                   focus:ring-4 focus:ring-white/30 transition-all duration-200"
            @input="handleSearchInput"
          />
          <button
            v-if="searchInput"
            class="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
            @click="clearSearch"
          >
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ─── CATEGORÍAS ────────────────────────────────────────────────────── -->
    <div class="bg-white border-b border-gray-100 sticky top-16 z-30 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">
          <button
            class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
            :class="!activeCategory
              ? 'bg-red-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            @click="clearCategory"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            Todos
          </button>

          <template v-if="loadingCategories">
            <div v-for="n in 5" :key="n" class="flex-shrink-0 h-8 w-24 bg-gray-100 rounded-xl animate-pulse" />
          </template>

          <button
            v-for="cat in categories"
            :key="cat.id"
            class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
            :class="activeCategory === cat.name ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            :style="activeCategory === cat.name ? { backgroundColor: cat.color } : {}"
            @click="filterByCategory(cat.name)"
          >
            <span
              class="w-2 h-2 rounded-full flex-shrink-0"
              :style="{ backgroundColor: activeCategory === cat.name ? 'rgba(255,255,255,0.8)' : cat.color }"
            />
            {{ cat.name }}
            <span class="opacity-60">({{ cat.productCount }})</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ─── CUERPO PRINCIPAL ───────────────────────────────────────────────── -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div class="flex gap-6 items-start">

        <!-- ─── SIDEBAR DESKTOP ─────────────────────────────────────────── -->
        <aside class="hidden lg:flex flex-col gap-4 w-60 flex-shrink-0 sticky top-[120px]">

          <div v-if="restaurants.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
              </svg>
              Restaurantes
            </h3>
            <div class="space-y-0.5">
              <button
                class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                :class="!activeRestaurantId ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                @click="clearRestaurant"
              >
                <span>Todos</span>
                <span class="opacity-60 text-[11px]">{{ total }}</span>
              </button>
              <button
                v-for="r in restaurants"
                :key="r.id"
                class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors"
                :class="activeRestaurantId === r.id
                  ? 'bg-red-50 text-red-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'"
                @click="filterByRestaurant(r.id)"
              >
                <span class="truncate mr-2">{{ r.name }}</span>
                <span class="text-[11px] opacity-60 flex-shrink-0">{{ r.productCount }}</span>
              </button>
            </div>
          </div>

          <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Ordenar por</h3>
            <div class="space-y-0.5">
              <button
                v-for="opt in sortOptions"
                :key="opt.value"
                class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                :class="selectedSort === opt.value ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                @click="applySort(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Mis favoritos sidebar -->
          <div v-if="favoriteProducts.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                Favoritos
              </h3>
              <button class="text-[10px] text-gray-400 hover:text-red-500 transition-colors" @click="clearAllFavorites">Limpiar</button>
            </div>
            <div class="space-y-2">
              <div
                v-for="p in favoriteProducts.slice(0, 4)"
                :key="p.id"
                class="flex items-center gap-2 cursor-pointer group/fav"
                @click="openProduct(p)"
              >
                <div class="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  <img v-if="p.image" :src="p.image" :alt="p.name" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full bg-gray-200" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold text-gray-800 truncate group-hover/fav:text-red-600 transition-colors">{{ p.name }}</p>
                  <p class="text-[11px] font-black text-red-600">${{ formatPrice(p.price) }}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            v-if="activeCategory || activeRestaurantId || searchInput"
            class="w-full text-xs font-semibold text-red-600 py-2.5 px-4 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
            @click="doResetFilters"
          >
            ✕ Limpiar todos los filtros
          </button>
        </aside>

        <!-- ─── CONTENIDO PRINCIPAL ─────────────────────────────────────── -->
        <div class="flex-1 min-w-0">

          <!-- Mis favoritos (horizontal, mobile) -->
          <div
            v-if="favoriteProducts.length > 0 && !activeCategory && !activeRestaurantId && !searchInput"
            class="mb-6 lg:hidden"
          >
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                <svg class="w-4 h-4 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                Mis favoritos
              </h2>
              <button class="text-xs text-gray-400 hover:text-red-500 transition-colors" @click="clearAllFavorites">Limpiar</button>
            </div>
            <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              <div
                v-for="p in favoriteProducts"
                :key="p.id"
                class="flex-shrink-0 w-36 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                @click="openProduct(p)"
              >
                <div class="aspect-video bg-gray-100 overflow-hidden">
                  <img v-if="p.image" :src="p.image" :alt="p.name" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                </div>
                <div class="p-2">
                  <p class="text-xs font-semibold text-gray-900 line-clamp-1">{{ p.name }}</p>
                  <p class="text-xs font-black text-red-600 mt-0.5">${{ formatPrice(p.price) }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Toolbar -->
          <div class="flex items-center justify-between mb-4 gap-3">
            <div>
              <p class="text-sm font-bold text-gray-800">
                <span v-if="loading">Buscando...</span>
                <span v-else>
                  <span class="text-red-600">{{ total }}</span>
                  {{ total === 1 ? ' producto disponible' : ' productos disponibles' }}
                </span>
              </p>
              <p v-if="activeCategory || activeRestaurantId" class="text-xs text-gray-400 mt-0.5">
                <span v-if="activeCategory">Categoría: <strong>{{ activeCategory }}</strong></span>
                <span v-if="activeCategory && activeRestaurantId"> · </span>
                <span v-if="activeRestaurantId">{{ restaurants.find(r => r.id === activeRestaurantId)?.name }}</span>
              </p>
            </div>
            <div class="lg:hidden">
              <select
                v-model="selectedSort"
                class="text-xs font-medium border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-red-200 cursor-pointer"
                @change="applySort(selectedSort)"
              >
                <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <svg class="w-10 h-10 text-red-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
            <p class="text-sm font-semibold text-red-700 mb-1">Error al cargar</p>
            <p class="text-xs text-red-500 mb-4">{{ error }}</p>
            <button class="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-colors" @click="loadProducts">
              Reintentar
            </button>
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
          <div v-else-if="products.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <p class="text-base font-bold text-gray-800 mb-1">Sin resultados</p>
            <p class="text-sm text-gray-400 mb-6">
              {{ searchInput ? `No hay productos para "${searchInput}"` : 'No hay productos con estos filtros' }}
            </p>
            <button class="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors" @click="doResetFilters">
              Ver todos los productos
            </button>
          </div>

          <!-- Grid -->
          <div v-else class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            <CatalogProductCard
              v-for="product in products"
              :key="product.id"
              :product="product"
              @view="openProduct"
            />
          </div>

          <!-- Paginación -->
          <div v-if="totalPages > 1" class="flex items-center justify-center gap-1.5 mt-8">
            <button
              class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="currentPage <= 1"
              @click="changePage(currentPage - 1)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <template v-for="page in visiblePages" :key="String(page)">
              <span v-if="page === '...'" class="w-9 h-9 flex items-center justify-center text-xs text-gray-400">…</span>
              <button
                v-else
                class="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all"
                :class="page === currentPage
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'"
                @click="changePage(page as number)"
              >{{ page }}</button>
            </template>
            <button
              class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              :disabled="currentPage >= totalPages"
              @click="changePage(currentPage + 1)"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- ─── BOTÓN FILTROS MOBILE ──────────────────────────────────────────── -->
    <div class="lg:hidden fixed bottom-6 left-5 z-[140]">
      <button
        class="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl shadow-xl border border-gray-100 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        @click="showMobileFilters = true"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
        </svg>
        Filtros
        <span v-if="activeFilterCount > 0" class="w-5 h-5 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
          {{ activeFilterCount }}
        </span>
      </button>
    </div>

    <!-- ─── TELEPORT ──────────────────────────────────────────────────────── -->
    <Teleport to="body">

      <!-- Toast -->
      <Transition
        enter-active-class="duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-3 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-3 scale-95"
      >
        <div
          v-if="toast.visible"
          class="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-3 px-5 py-3 bg-gray-900 text-white text-sm font-medium rounded-2xl shadow-2xl max-w-xs"
        >
          <div class="w-6 h-6 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
            <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <span class="line-clamp-1">{{ toast.message }}</span>
        </div>
      </Transition>

      <!-- Scroll to top -->
      <Transition
        enter-active-class="duration-200 ease-out"
        enter-from-class="opacity-0 scale-75"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-75"
      >
        <button
          v-if="showScrollTop"
          class="fixed bottom-24 right-5 lg:bottom-8 lg:right-8 z-[150] w-11 h-11 rounded-2xl bg-white shadow-xl border border-gray-100 flex items-center justify-center text-gray-600 hover:bg-red-600 hover:text-white hover:border-transparent transition-all duration-200 active:scale-90"
          @click="scrollToTop"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
          </svg>
        </button>
      </Transition>

      <!-- Mobile bottom sheet filtros -->
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="showMobileFilters" class="fixed inset-0 z-[190] flex items-end" @click.self="showMobileFilters = false">
          <div class="absolute inset-0 bg-black/40" @click="showMobileFilters = false" />
          <Transition enter-active-class="duration-300 ease-out" enter-from-class="translate-y-full" enter-to-class="translate-y-0"
            leave-active-class="duration-200 ease-in" leave-from-class="translate-y-0" leave-to-class="translate-y-full">
            <div v-if="showMobileFilters" class="relative w-full bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto shadow-2xl">
              <div class="flex justify-center pt-3 pb-1">
                <div class="w-10 h-1 rounded-full bg-gray-200" />
              </div>
              <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <h3 class="font-bold text-gray-900">Filtros</h3>
                <button class="text-sm text-red-600 font-semibold" @click="doResetFilters(); showMobileFilters = false">Limpiar todo</button>
              </div>
              <div v-if="restaurants.length > 0" class="p-5">
                <p class="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Restaurante</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    class="px-3 py-2 rounded-xl text-xs font-semibold border transition-colors"
                    :class="!activeRestaurantId ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                    @click="clearRestaurant"
                  >Todos</button>
                  <button
                    v-for="r in restaurants" :key="r.id"
                    class="px-3 py-2 rounded-xl text-xs font-semibold border transition-colors"
                    :class="activeRestaurantId === r.id ? 'bg-red-50 text-red-600 border-red-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                    @click="filterByRestaurant(r.id)"
                  >{{ r.name }} ({{ r.productCount }})</button>
                </div>
              </div>
              <div class="px-5 pb-5">
                <p class="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Ordenar por</p>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="opt in sortOptions" :key="opt.value"
                    class="px-3 py-2 rounded-xl text-xs font-semibold border transition-colors"
                    :class="selectedSort === opt.value ? 'bg-red-600 text-white border-red-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'"
                    @click="applySort(opt.value)"
                  >{{ opt.label }}</button>
                </div>
              </div>
              <div class="px-5 pb-6">
                <button class="w-full py-3.5 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-colors" @click="showMobileFilters = false">
                  Ver {{ total }} resultados
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- Modal de producto -->
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="selectedProduct" class="fixed inset-0 z-[200] flex items-center justify-center p-4" @click.self="selectedProduct = null">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="selectedProduct = null" />
          <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0">
            <div v-if="selectedProduct" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

              <!-- Imagen -->
              <div class="relative aspect-[16/9] bg-gray-100 rounded-t-3xl overflow-hidden">
                <img v-if="selectedProduct.image" :src="selectedProduct.image" :alt="selectedProduct.name" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div class="absolute top-3 left-3">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow" :style="{ backgroundColor: selectedProduct.category.color }">
                    {{ selectedProduct.category.name }}
                  </span>
                </div>
                <button
                  class="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors"
                  @click="selectedProduct = null"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <!-- Info -->
              <div class="p-5">
                <div class="flex items-start justify-between gap-3 mb-3">
                  <h2 class="text-xl font-black text-gray-900 leading-tight">{{ selectedProduct.name }}</h2>
                  <span class="text-2xl font-black text-red-600 flex-shrink-0">${{ formatPrice(selectedProduct.price) }}</span>
                </div>

                <p v-if="selectedProduct.description" class="text-sm text-gray-500 mb-4 leading-relaxed">{{ selectedProduct.description }}</p>

                <!-- Chips -->
                <div class="flex flex-wrap gap-2 mb-4">
                  <span class="flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl">
                    <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
                    </svg>
                    {{ selectedProduct.restaurant.name }}
                  </span>
                  <span v-if="selectedProduct.preparationTime" class="flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {{ selectedProduct.preparationTime }} min
                  </span>
                  <span v-if="selectedProduct.calories" class="flex items-center gap-1.5 text-xs font-medium bg-orange-50 text-orange-700 px-3 py-1.5 rounded-xl">
                    <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
                    </svg>
                    {{ selectedProduct.calories }} kcal
                  </span>
                  <span v-if="selectedProduct.unit && selectedProduct.unit !== 'unidad'" class="text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl">
                    Por {{ selectedProduct.unit }}
                  </span>
                </div>

                <!-- Loader detalle -->
                <div v-if="loadingDetail" class="space-y-3 mb-4">
                  <div class="h-3 bg-gray-100 rounded w-1/3 animate-pulse" />
                  <div class="flex gap-1.5">
                    <div v-for="n in 4" :key="n" class="h-6 w-16 bg-gray-100 rounded-full animate-pulse" />
                  </div>
                </div>

                <!-- Ingredientes -->
                <div v-if="!loadingDetail && productDetail?.id === selectedProduct?.id && productDetail.ingredients?.length" class="mb-4">
                  <h3 class="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">Ingredientes</h3>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="ing in productDetail.ingredients" :key="ing"
                      class="text-xs px-2.5 py-1 bg-gray-50 text-gray-600 rounded-full border border-gray-100">
                      {{ ing }}
                    </span>
                  </div>
                </div>

                <!-- Alérgenos -->
                <div v-if="!loadingDetail && productDetail?.id === selectedProduct?.id && productDetail.allergens?.length" class="mb-4">
                  <h3 class="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                    </svg>
                    Contiene alérgenos
                  </h3>
                  <div class="flex flex-wrap gap-1.5">
                    <span v-for="al in productDetail.allergens" :key="al"
                      class="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-100 font-medium">
                      {{ al }}
                    </span>
                  </div>
                </div>

                <!-- Acciones -->
                <div class="flex items-center gap-2 pt-3 border-t border-gray-100 mt-1">
                  <button
                    class="flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors border border-gray-200"
                    @click="copyProductUrl"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                    </svg>
                    Compartir
                  </button>
                  <button
                    class="w-10 h-10 rounded-xl border flex items-center justify-center transition-all flex-shrink-0"
                    :class="isFavorite(selectedProduct.id)
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400'"
                    @click.stop="toggleFavorite(selectedProduct.id)"
                  >
                    <svg class="w-5 h-5" :fill="isFavorite(selectedProduct.id) ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                    </svg>
                  </button>
                  <button
                    class="flex-1 py-2.5 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-sm shadow-red-200"
                    @click="handleWantProduct"
                  >
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { CatalogProduct } from '~/composables/useCatalog'

definePageMeta({ layout: 'default' })

const {
  products, categories, restaurants,
  loading, loadingCategories, loadingDetail, productDetail,
  error, total, totalPages, query,
  loadCategories, loadRestaurants, loadProducts, fetchProduct,
  search, filterByCategory, filterByRestaurant,
  changePage, changeSort, resetFilters,
  toggleFavorite, isFavorite, clearAllFavorites,
} = useCatalog()

const { user } = useAuth()

// ─── Estado local ─────────────────────────────────────────────────────────────
const searchInput = ref(query.value.search || '')
const selectedProduct = ref<CatalogProduct | null>(null)
const showMobileFilters = ref(false)
const showScrollTop = ref(false)
const selectedSort = ref<'relevance' | 'price_asc' | 'price_desc' | 'name'>(query.value.sort)
const toast = ref({ visible: false, message: '' })
let toastTimeout: ReturnType<typeof setTimeout> | null = null

const sortOptions = [
  { value: 'relevance' as const, label: 'Relevancia' },
  { value: 'price_asc' as const, label: 'Menor precio' },
  { value: 'price_desc' as const, label: 'Mayor precio' },
  { value: 'name' as const, label: 'Nombre A-Z' },
]

// ─── Computed ─────────────────────────────────────────────────────────────────
const firstName = computed(() => user.value?.firstName || 'Usuario')
const currentPage = computed(() => query.value.page)
const activeCategory = computed(() => query.value.categoryName)
const activeRestaurantId = computed(() => query.value.restaurantId)
const activeFilterCount = computed(() => (activeCategory.value ? 1 : 0) + (activeRestaurantId.value ? 1 : 0) + (searchInput.value ? 1 : 0))

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

const favoriteProducts = computed(() => products.value.filter(p => isFavorite(p.id)))

// ─── Hero stats animadas ──────────────────────────────────────────────────────
const displayTotal = ref(0)
const displayRestaurants = ref(0)

function animateCounter(target: { value: number }, end: number, duration = 700) {
  const startVal = target.value
  const startTime = performance.now()
  function step(now: number) {
    const progress = Math.min((now - startTime) / duration, 1)
    target.value = Math.round(startVal + (end - startVal) * (1 - Math.pow(1 - progress, 3)))
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}
watch(total, val => { if (val > 0) animateCounter(displayTotal, val) }, { immediate: true })
watch(() => restaurants.value.length, val => { if (val > 0) animateCounter(displayRestaurants, val) }, { immediate: true })

// ─── Paginación ───────────────────────────────────────────────────────────────
const visiblePages = computed(() => {
  const cur = currentPage.value
  const max = totalPages.value
  if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(max - 1, cur + 1); i++) pages.push(i)
  if (cur < max - 2) pages.push('...')
  pages.push(max)
  return pages
})

// ─── Scroll ───────────────────────────────────────────────────────────────────
function handleScroll() { showScrollTop.value = window.scrollY > 400 }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

// ─── Acciones ─────────────────────────────────────────────────────────────────
function handleSearchInput() { search(searchInput.value) }
function clearSearch() { searchInput.value = ''; search('') }
function clearCategory() { if (activeCategory.value) filterByCategory(activeCategory.value) }
function clearRestaurant() { if (activeRestaurantId.value) filterByRestaurant(activeRestaurantId.value) }
function doResetFilters() { searchInput.value = ''; selectedSort.value = 'relevance'; resetFilters() }
function applySort(val: typeof selectedSort.value) { selectedSort.value = val; changeSort(val) }

function openProduct(product: CatalogProduct) {
  selectedProduct.value = product
  fetchProduct(product.id)
}

function showToast(msg: string) {
  if (toastTimeout) clearTimeout(toastTimeout)
  toast.value = { visible: true, message: msg }
  toastTimeout = setTimeout(() => { toast.value.visible = false }, 3000)
}

function handleWantProduct() {
  if (selectedProduct.value) showToast(`¡${selectedProduct.value.name} guardado en tu lista!`)
  selectedProduct.value = null
}

async function copyProductUrl() {
  if (!selectedProduct.value) return
  const url = `${window.location.origin}/inicio?p=${selectedProduct.value.id}`
  try {
    await navigator.clipboard.writeText(url)
    showToast('Enlace copiado al portapapeles')
  } catch {
    showToast('No se pudo copiar el enlace')
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  await Promise.all([loadCategories(), loadRestaurants(), loadProducts()])
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (toastTimeout) clearTimeout(toastTimeout)
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
