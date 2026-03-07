<template>
  <div class="min-h-screen bg-gray-50">

    <!-- ─── HERO ──────────────────────────────────────────────────────────── -->
    <div
      class="relative overflow-hidden px-4 py-10 sm:py-14 transition-colors duration-500"
      :class="activeTab === 'productos'
        ? 'bg-gradient-to-br from-red-600 via-red-500 to-orange-500'
        : 'bg-gradient-to-br from-blue-700 via-blue-500 to-indigo-500'"
    >
      <div class="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      <div class="absolute -bottom-20 -left-10 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />

      <div class="relative max-w-2xl mx-auto text-center">
        <p class="text-white/80 text-sm font-medium mb-1">
          {{ greeting }}, <strong class="text-white">{{ firstName }}</strong> {{ greetingEmoji }}
        </p>
        <h1 class="text-3xl sm:text-4xl font-black text-white mb-5 leading-tight">
          {{ activeTab === 'productos' ? '¿Qué vas a pedir hoy?' : '¿Qué servicio necesitas?' }}
        </h1>

        <!-- Tabs -->
        <div class="inline-flex bg-white/15 backdrop-blur-sm rounded-2xl p-1 mb-5">
          <button
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200"
            :class="activeTab === 'productos' ? 'bg-white text-red-600 shadow-sm' : 'text-white hover:bg-white/10'"
            @click="setTab('productos')"
          >
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              Productos
            </span>
          </button>
          <button
            class="px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200"
            :class="activeTab === 'servicios' ? 'bg-white text-blue-600 shadow-sm' : 'text-white hover:bg-white/10'"
            @click="setTab('servicios')"
          >
            <span class="flex items-center gap-1.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Servicios
            </span>
          </button>
        </div>

        <!-- Stats -->
        <div class="flex items-center justify-center gap-3 mb-5">
          <div class="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-2.5">
            <div class="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </div>
            <div class="text-left">
              <p class="text-white font-black text-xl leading-none">{{ displayCount }}</p>
              <p class="text-white/70 text-[11px] leading-none mt-0.5">{{ activeTab === 'productos' ? 'productos' : 'servicios' }}</p>
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
              <p class="text-white font-black text-xl leading-none">{{ displayGroups }}</p>
              <p class="text-white/70 text-[11px] leading-none mt-0.5">{{ activeTab === 'productos' ? 'restaurantes' : 'proveedores' }}</p>
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
            :placeholder="activeTab === 'productos' ? 'Busca productos, restaurantes, categorías...' : 'Busca servicios, categorías, proveedores...'"
            class="w-full pl-12 pr-10 py-4 rounded-2xl text-sm text-gray-900 bg-white shadow-lg placeholder-gray-400 outline-none focus:ring-4 focus:ring-white/30 transition-all duration-200"
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

    <!-- ─── CATEGORÍAS STICKY ───────────────────────────────────────────────── -->
    <div class="bg-white border-b border-gray-100 sticky top-16 z-30 shadow-sm">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="flex items-center gap-2 overflow-x-auto py-3 scrollbar-none">

          <!-- Tab Productos -->
          <template v-if="activeTab === 'productos'">
            <button
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
              :class="!pActiveCategory ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="pClearCategory"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              Todos
            </button>
            <template v-if="pLoadingCategories">
              <div v-for="n in 5" :key="n" class="flex-shrink-0 h-8 w-24 bg-gray-100 rounded-xl animate-pulse" />
            </template>
            <button
              v-for="cat in pCategories"
              :key="cat.id"
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
              :class="pActiveCategory === cat.name ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              :style="pActiveCategory === cat.name ? { backgroundColor: cat.color } : {}"
              @click="pFilterByCategory(cat.name)"
            >
              <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: pActiveCategory === cat.name ? 'rgba(255,255,255,0.8)' : cat.color }" />
              {{ cat.name }}
              <span class="opacity-60">({{ cat.productCount }})</span>
            </button>
          </template>

          <!-- Tab Servicios -->
          <template v-else>
            <button
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
              :class="!sActiveCategoryId ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="sClearCategory"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              Todos
            </button>
            <template v-if="sLoadingCategories">
              <div v-for="n in 5" :key="n" class="flex-shrink-0 h-8 w-24 bg-gray-100 rounded-xl animate-pulse" />
            </template>
            <button
              v-for="cat in sCategories"
              :key="cat.id"
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
              :class="sActiveCategoryId === cat.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              :style="sActiveCategoryId === cat.id ? { backgroundColor: cat.color || '#3B82F6' } : {}"
              @click="sFilterByCategory(cat.id)"
            >
              <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: sActiveCategoryId === cat.id ? 'rgba(255,255,255,0.8)' : (cat.color || '#3B82F6') }" />
              {{ cat.name }}
              <span class="opacity-60">({{ cat.serviceCount }})</span>
            </button>
          </template>

        </div>
      </div>
    </div>

    <!-- ─── CUERPO PRINCIPAL ────────────────────────────────────────────────── -->
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div class="flex gap-6 items-start">

        <!-- ─── SIDEBAR DESKTOP ─────────────────────────────────────────── -->
        <aside class="hidden lg:flex flex-col gap-4 w-60 flex-shrink-0 sticky top-[120px]">

          <!-- SIDEBAR PRODUCTOS -->
          <template v-if="activeTab === 'productos'">
            <div v-if="pRestaurants.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
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
                  :class="!pActiveRestaurantId ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                  @click="pClearRestaurant"
                >
                  <span>Todos</span>
                  <span class="opacity-60 text-[11px]">{{ pTotal }}</span>
                </button>
                <button
                  v-for="r in pRestaurants" :key="r.id"
                  class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors"
                  :class="pActiveRestaurantId === r.id ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="pFilterByRestaurant(r.id)"
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
                  v-for="opt in sortOptions" :key="opt.value"
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="pSelectedSort === opt.value ? 'bg-red-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                  @click="pApplySort(opt.value)"
                >{{ opt.label }}</button>
              </div>
            </div>
            <button
              v-if="pActiveCategory || pActiveRestaurantId || (activeTab === 'productos' && searchInput)"
              class="w-full text-xs font-semibold text-red-600 py-2.5 px-4 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
              @click="pResetFilters"
            >
              ✕ Limpiar filtros
            </button>
          </template>

          <!-- SIDEBAR SERVICIOS -->
          <template v-else>
            <div v-if="sProviders.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                Proveedores
              </h3>
              <div class="space-y-0.5">
                <button
                  class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="!sActiveProviderId ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                  @click="sClearProvider"
                >
                  <span>Todos</span>
                  <span class="opacity-60 text-[11px]">{{ sTotal }}</span>
                </button>
                <button
                  v-for="p in sProviders" :key="p.id"
                  class="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors"
                  :class="sActiveProviderId === p.id ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="sFilterByProvider(p.id)"
                >
                  <span class="truncate mr-2">{{ p.name }}</span>
                  <span class="text-[11px] opacity-60 flex-shrink-0">{{ p.serviceCount }}</span>
                </button>
              </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Ordenar por</h3>
              <div class="space-y-0.5">
                <button
                  v-for="opt in serviceSortOptions" :key="opt.value"
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="sSelectedSort === opt.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                  @click="sApplySort(opt.value)"
                >{{ opt.label }}</button>
              </div>
            </div>
            <button
              v-if="sActiveCategoryId || sActiveProviderId || (activeTab === 'servicios' && searchInput)"
              class="w-full text-xs font-semibold text-blue-600 py-2.5 px-4 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors"
              @click="sResetFilters"
            >
              ✕ Limpiar filtros
            </button>
          </template>

        </aside>

        <!-- ─── CONTENIDO PRINCIPAL ─────────────────────────────────────── -->
        <div class="flex-1 min-w-0">

          <!-- ── TAB PRODUCTOS ───────────────────────────────────────────── -->
          <template v-if="activeTab === 'productos'">

            <!-- Toolbar -->
            <div class="flex items-center justify-between mb-4 gap-3">
              <div>
                <p class="text-sm font-bold text-gray-800">
                  <span v-if="pLoading">Buscando...</span>
                  <span v-else><span class="text-red-600">{{ pTotal }}</span> {{ pTotal === 1 ? ' producto disponible' : ' productos disponibles' }}</span>
                </p>
                <p v-if="pActiveCategory || pActiveRestaurantId" class="text-xs text-gray-400 mt-0.5">
                  <span v-if="pActiveCategory">Categoría: <strong>{{ pActiveCategory }}</strong></span>
                  <span v-if="pActiveCategory && pActiveRestaurantId"> · </span>
                  <span v-if="pActiveRestaurantId">{{ pRestaurants.find(r => r.id === pActiveRestaurantId)?.name }}</span>
                </p>
              </div>
              <div class="lg:hidden">
                <select v-model="pSelectedSort" class="text-xs font-medium border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none" @change="pApplySort(pSelectedSort)">
                  <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>

            <!-- Error -->
            <div v-if="pError" class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <p class="text-sm font-semibold text-red-700 mb-3">{{ pError }}</p>
              <button class="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl" @click="pLoadProducts">Reintentar</button>
            </div>

            <!-- Skeleton -->
            <div v-else-if="pLoading" class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
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
            <div v-else-if="pProducts.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <p class="text-base font-bold text-gray-800 mb-1">Sin resultados</p>
              <p class="text-sm text-gray-400 mb-6">{{ searchInput ? `No hay productos para "${searchInput}"` : 'No hay productos con estos filtros' }}</p>
              <button class="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors" @click="pResetFilters">Ver todos los productos</button>
            </div>

            <!-- Grid -->
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              <CatalogProductCard v-for="product in pProducts" :key="product.id" :product="product" :isOwner="isOwnProduct(product)" @view="openProduct" @order="openOrderModal" />
            </div>

            <!-- Paginación -->
            <div v-if="pTotalPages > 1" class="flex items-center justify-center gap-1.5 mt-8">
              <button class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="pCurrentPage <= 1" @click="pChangePage(pCurrentPage - 1)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <template v-for="page in pVisiblePages" :key="String(page)">
                <span v-if="page === '...'" class="w-9 h-9 flex items-center justify-center text-xs text-gray-400">…</span>
                <button v-else class="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all"
                  :class="page === pCurrentPage ? 'bg-red-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'"
                  @click="pChangePage(page as number)">{{ page }}</button>
              </template>
              <button class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="pCurrentPage >= pTotalPages" @click="pChangePage(pCurrentPage + 1)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </template>

          <!-- ── TAB SERVICIOS ────────────────────────────────────────────── -->
          <template v-else>

            <!-- Toolbar -->
            <div class="flex items-center justify-between mb-4 gap-3">
              <div>
                <p class="text-sm font-bold text-gray-800">
                  <span v-if="sLoading">Buscando...</span>
                  <span v-else><span class="text-blue-600">{{ sTotal }}</span> {{ sTotal === 1 ? ' servicio disponible' : ' servicios disponibles' }}</span>
                </p>
                <p v-if="sActiveCategoryId || sActiveProviderId" class="text-xs text-gray-400 mt-0.5">
                  <span v-if="sActiveCategoryId">Categoría: <strong>{{ sCategories.find(c => c.id === sActiveCategoryId)?.name }}</strong></span>
                  <span v-if="sActiveCategoryId && sActiveProviderId"> · </span>
                  <span v-if="sActiveProviderId">{{ sProviders.find(p => p.id === sActiveProviderId)?.name }}</span>
                </p>
              </div>
              <div class="lg:hidden">
                <select v-model="sSelectedSort" class="text-xs font-medium border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none" @change="sApplySort(sSelectedSort)">
                  <option v-for="opt in serviceSortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>

            <!-- Error -->
            <div v-if="sError" class="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
              <p class="text-sm font-semibold text-blue-700 mb-3">{{ sError }}</p>
              <button class="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl" @click="sLoadServices">Reintentar</button>
            </div>

            <!-- Skeleton -->
            <div v-else-if="sLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
            <div v-else-if="sServices.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <div class="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <p class="text-base font-bold text-gray-800 mb-1">Sin servicios disponibles</p>
              <p class="text-sm text-gray-400 mb-6">{{ searchInput ? `No hay servicios para "${searchInput}"` : 'No hay servicios con estos filtros' }}</p>
              <button class="px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors" @click="sResetFilters">Ver todos los servicios</button>
            </div>

            <!-- Grid servicios -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <div
                v-for="srv in sServices"
                :key="srv.id"
                class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                @click="openService(srv)"
              >
                <!-- Imagen -->
                <div class="relative aspect-video bg-blue-50 overflow-hidden">
                  <img v-if="srv.image" :src="srv.image" :alt="srv.name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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

                  <!-- Tags -->
                  <div v-if="srv.tags.length" class="flex flex-wrap gap-1 mb-3">
                    <span v-for="tag in srv.tags.slice(0,3)" :key="tag" class="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{{ tag }}</span>
                  </div>

                  <!-- Precio y duración -->
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="text-lg font-black text-blue-600">${{ formatPrice(srv.price) }}</span>
                      <span v-if="srv.priceUnit" class="text-xs text-gray-400 ml-1">/ {{ srv.priceUnit }}</span>
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

            <!-- Paginación servicios -->
            <div v-if="sTotalPages > 1" class="flex items-center justify-center gap-1.5 mt-8">
              <button class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="sCurrentPage <= 1" @click="sChangePage(sCurrentPage - 1)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <template v-for="page in sVisiblePages" :key="String(page)">
                <span v-if="page === '...'" class="w-9 h-9 flex items-center justify-center text-xs text-gray-400">…</span>
                <button v-else class="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all"
                  :class="page === sCurrentPage ? 'bg-blue-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'"
                  @click="sChangePage(page as number)">{{ page }}</button>
              </template>
              <button class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="sCurrentPage >= sTotalPages" @click="sChangePage(sCurrentPage + 1)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </template>

        </div>
      </div>
    </div>

    <!-- ─── Scroll to top ──────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition enter-active-class="duration-200 ease-out" enter-from-class="opacity-0 scale-75" enter-to-class="opacity-100 scale-100"
        leave-active-class="duration-150 ease-in" leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-75">
        <button v-if="showScrollTop"
          class="fixed bottom-8 right-8 z-[150] w-11 h-11 rounded-2xl bg-white shadow-xl border border-gray-100 flex items-center justify-center text-gray-600 hover:text-white hover:border-transparent transition-all duration-200 active:scale-90"
          :class="activeTab === 'productos' ? 'hover:bg-red-600' : 'hover:bg-blue-600'"
          @click="scrollToTop">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
          </svg>
        </button>
      </Transition>

      <!-- Modal producto -->
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="selectedProduct" class="fixed inset-0 z-[200] flex items-center justify-center p-4" @click.self="selectedProduct = null">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="selectedProduct = null" />
          <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0">
            <div v-if="selectedProduct" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div class="relative aspect-[16/9] bg-gray-100 rounded-t-3xl overflow-hidden">
                <img v-if="selectedProduct.image" :src="selectedProduct.image" :alt="selectedProduct.name" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <svg class="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div class="absolute top-3 left-3">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow" :style="{ backgroundColor: selectedProduct.category.color }">{{ selectedProduct.category.name }}</span>
                </div>
                <button class="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors" @click="selectedProduct = null">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="p-5">
                <div class="flex items-start justify-between gap-3 mb-3">
                  <h2 class="text-xl font-black text-gray-900 leading-tight">{{ selectedProduct.name }}</h2>
                  <span class="text-2xl font-black text-red-600 flex-shrink-0">${{ formatPrice(selectedProduct.price) }}</span>
                </div>
                <p v-if="selectedProduct.description" class="text-sm text-gray-500 mb-4 leading-relaxed">{{ selectedProduct.description }}</p>
                <div class="flex flex-wrap gap-2 mb-4">
                  <NuxtLink v-if="selectedProduct.restaurant.user?.username"
                    :to="`/p/${selectedProduct.restaurant.user.username}`"
                    class="flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors"
                    @click="selectedProduct = null">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                    {{ selectedProduct.restaurant.name }}
                  </NuxtLink>
                  <span v-else class="flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl">
                    <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                    {{ selectedProduct.restaurant.name }}
                  </span>
                  <span v-if="selectedProduct.preparationTime" class="flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ selectedProduct.preparationTime }} min
                  </span>
                </div>
                <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    v-if="!isOwnProduct(selectedProduct!)"
                    class="flex-1 py-2.5 bg-red-600 text-white text-sm font-black rounded-xl hover:bg-red-700 active:scale-95 transition-all duration-200 shadow-sm shadow-red-200"
                    @click="openOrderModal(selectedProduct!); selectedProduct = null">
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

      <!-- Modal servicio -->
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="selectedService" class="fixed inset-0 z-[200] flex items-center justify-center p-4" @click.self="selectedService = null">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="selectedService = null" />
          <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0">
            <div v-if="selectedService" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div class="relative aspect-video bg-blue-50 rounded-t-3xl overflow-hidden">
                <img v-if="selectedService.image" :src="selectedService.image" :alt="selectedService.name" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                  <svg class="w-16 h-16 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div v-if="selectedService.category" class="absolute top-3 left-3">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow" :style="{ backgroundColor: selectedService.category.color || '#3B82F6' }">{{ selectedService.category.name }}</span>
                </div>
                <button class="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors" @click="selectedService = null">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="p-5">
                <div class="flex items-start justify-between gap-3 mb-2">
                  <h2 class="text-xl font-black text-gray-900 leading-tight">{{ selectedService.name }}</h2>
                  <div class="text-right flex-shrink-0">
                    <span class="text-2xl font-black text-blue-600">${{ formatPrice(selectedService.price) }}</span>
                    <p v-if="selectedService.priceUnit" class="text-xs text-gray-400">/ {{ selectedService.priceUnit }}</p>
                  </div>
                </div>
                <p v-if="selectedService.description" class="text-sm text-gray-500 mb-4 leading-relaxed">{{ selectedService.description }}</p>
                <div class="flex flex-wrap gap-2 mb-4">
                  <!-- Proveedor -->
                  <div class="flex items-center gap-2 w-full">
                    <div class="w-8 h-8 rounded-full overflow-hidden bg-blue-100 flex-shrink-0">
                      <img v-if="selectedService.user.avatar" :src="avatarSrc(selectedService.user.avatar)" :alt="selectedService.user.firstName" class="w-full h-full object-cover" />
                      <span v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-blue-600">
                        {{ selectedService.user.firstName[0] }}{{ selectedService.user.lastName[0] }}
                      </span>
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-gray-800">{{ selectedService.user.firstName }} {{ selectedService.user.lastName }}</p>
                      <p v-if="selectedService.user.category" class="text-xs text-gray-400">{{ selectedService.user.subcategory?.name ?? selectedService.user.category.name }}</p>
                    </div>
                  </div>
                  <span v-if="selectedService.duration" class="flex items-center gap-1.5 text-xs font-medium bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    {{ selectedService.duration }} min estimados
                  </span>
                </div>
                <!-- Tags -->
                <div v-if="selectedService.tags.length" class="flex flex-wrap gap-1.5 mb-4">
                  <span v-for="tag in selectedService.tags" :key="tag" class="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-medium border border-blue-100">{{ tag }}</span>
                </div>
                <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <NuxtLink v-if="selectedService.user.username" :to="`/p/${selectedService.user.username}`"
                    class="flex-shrink-0 text-xs font-semibold text-blue-600 py-2.5 px-4 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors">
                    Ver perfil
                  </NuxtLink>
                  <button
                    v-if="!isOwnService(selectedService!)"
                    class="flex-1 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-200 shadow-sm shadow-blue-200"
                    @click="selectedService = null">
                    Contactar
                  </button>
                  <span v-else class="flex-1 text-center text-sm font-semibold text-gray-400 py-2.5 bg-gray-100 rounded-xl">
                    Este es tu servicio
                  </span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
      <!-- Modal pedido -->
      <ModalsCatalogOrderModal v-model="showOrderModal" :product="orderProduct" @success="onOrderSuccess" />

      <!-- Toast éxito pedido -->
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 translate-y-4" enter-to-class="opacity-100 translate-y-0"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="orderToast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-green-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
          ¡Pedido enviado! El comercio se pondrá en contacto contigo.
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import type { CatalogProduct } from '~/composables/useCatalog'
import type { CatalogService } from '~/composables/useServices'

definePageMeta({ layout: 'default' })

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

// ─── Productos ────────────────────────────────────────────────────────────────
const {
  products: pProducts, categories: pCategories, restaurants: pRestaurants,
  loading: pLoading, loadingCategories: pLoadingCategories,
  error: pError, total: pTotal, totalPages: pTotalPages, query: pQuery,
  loadCategories: pLoadCategories, loadRestaurants: pLoadRestaurants, loadProducts: pLoadProducts,
  search: pSearch, filterByCategory: pFilterByCategory, filterByRestaurant: pFilterByRestaurant,
  changePage: pChangePage, changeSort: pChangeSort, resetFilters: pResetFilters,
  toggleFavorite, isFavorite,
} = useCatalog()

// ─── Servicios ────────────────────────────────────────────────────────────────
const {
  services: sServices, categories: sCategories, providers: sProviders,
  loading: sLoading, loadingCategories: sLoadingCategories,
  error: sError, total: sTotal, totalPages: sTotalPages, query: sQuery,
  loadCategories: sLoadCategories, loadProviders: sLoadProviders, loadServices: sLoadServices,
  search: sSearch, filterByCategory: sFilterByCategory, filterByProvider: sFilterByProvider,
  changePage: sChangePage, changeSort: sChangeSort, resetFilters: sResetFilters,
} = useServices()

const { user } = useAuth()

// ─── Estado local ─────────────────────────────────────────────────────────────
const activeTab = ref<'productos' | 'servicios'>('productos')
const searchInput = ref('')
const selectedProduct = ref<CatalogProduct | null>(null)
const selectedService = ref<CatalogService | null>(null)
const showScrollTop = ref(false)
const showOrderModal = ref(false)
const orderProduct = ref<CatalogProduct | null>(null)
const orderToast = ref(false)

const pSelectedSort = ref<'relevance' | 'price_asc' | 'price_desc' | 'name'>('relevance')
const sSelectedSort = ref<'relevance' | 'price_asc' | 'price_desc' | 'name' | 'newest'>('relevance')

const sortOptions = [
  { value: 'relevance' as const, label: 'Relevancia' },
  { value: 'price_asc' as const, label: 'Menor precio' },
  { value: 'price_desc' as const, label: 'Mayor precio' },
  { value: 'name' as const, label: 'Nombre A-Z' },
]
const serviceSortOptions = [
  { value: 'relevance' as const, label: 'Relevancia' },
  { value: 'newest' as const, label: 'Más recientes' },
  { value: 'price_asc' as const, label: 'Menor precio' },
  { value: 'price_desc' as const, label: 'Mayor precio' },
  { value: 'name' as const, label: 'Nombre A-Z' },
]

// ─── Computed ─────────────────────────────────────────────────────────────────
const firstName = computed(() => user.value?.firstName || 'Usuario')
const pCurrentPage = computed(() => pQuery.value.page)
const pActiveCategory = computed(() => pQuery.value.categoryName)
const pActiveRestaurantId = computed(() => pQuery.value.restaurantId)
const sCurrentPage = computed(() => sQuery.value.page)
const sActiveCategoryId = computed(() => sQuery.value.categoryId)
const sActiveProviderId = computed(() => sQuery.value.userId)

const displayCount = ref(0)
const displayGroups = ref(0)

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

// Animate hero stats based on active tab
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

watch([activeTab, pTotal, sTotal, () => pRestaurants.value.length, () => sProviders.value.length], () => {
  if (activeTab.value === 'productos') {
    animateCounter(displayCount, pTotal.value)
    animateCounter(displayGroups, pRestaurants.value.length)
  } else {
    animateCounter(displayCount, sTotal.value)
    animateCounter(displayGroups, sProviders.value.length)
  }
}, { immediate: true })

// Paginación helper
function buildVisiblePages(cur: number, max: number) {
  if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(max - 1, cur + 1); i++) pages.push(i)
  if (cur < max - 2) pages.push('...')
  pages.push(max)
  return pages
}
const pVisiblePages = computed(() => buildVisiblePages(pCurrentPage.value, pTotalPages.value))
const sVisiblePages = computed(() => buildVisiblePages(sCurrentPage.value, sTotalPages.value))

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avatarSrc(avatar: string) {
  if (avatar.startsWith('http')) return avatar
  return `${apiUrl}${avatar}`
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function setTab(tab: 'productos' | 'servicios') {
  activeTab.value = tab
  searchInput.value = ''
}

function handleSearchInput() {
  if (activeTab.value === 'productos') pSearch(searchInput.value)
  else sSearch(searchInput.value)
}

function clearSearch() {
  searchInput.value = ''
  if (activeTab.value === 'productos') pSearch('')
  else sSearch('')
}

function pClearCategory() { if (pActiveCategory.value) pFilterByCategory(pActiveCategory.value) }
function pClearRestaurant() { if (pActiveRestaurantId.value) pFilterByRestaurant(pActiveRestaurantId.value) }
function pApplySort(val: typeof pSelectedSort.value) { pSelectedSort.value = val; pChangeSort(val) }

function sClearCategory() { sFilterByCategory(null) }
function sClearProvider() { sFilterByProvider(null) }
function sApplySort(val: typeof sSelectedSort.value) { sSelectedSort.value = val; sChangeSort(val) }

// Un COMMERCE no puede pedir sus propios productos; un FREELANCER/COMMERCE no puede contratar sus propios servicios
function isOwnProduct(product: CatalogProduct): boolean {
  const u = user.value
  if (!u || !u.restaurant) return false
  return u.restaurant.id === product.restaurant.id
}

function isOwnService(srv: CatalogService): boolean {
  const u = user.value
  if (!u) return false
  return u.id === srv.user.id
}

function openProduct(product: CatalogProduct) { selectedProduct.value = product }
function openService(srv: CatalogService) { selectedService.value = srv }
function openOrderModal(product: CatalogProduct) { orderProduct.value = product; showOrderModal.value = true }
function onOrderSuccess() {
  orderToast.value = true
  setTimeout(() => { orderToast.value = false }, 4000)
}

function handleScroll() { showScrollTop.value = window.scrollY > 400 }
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  await Promise.all([
    pLoadCategories(), pLoadRestaurants(), pLoadProducts(),
    sLoadCategories(), sLoadProviders(), sLoadServices(),
  ])
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
