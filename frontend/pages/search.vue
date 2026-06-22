<template>
  <div class="min-h-screen bg-gray-50">

    <!-- ─── HERO ──────────────────────────────────────────────────────────── -->
    <div
      class="relative overflow-hidden px-4 py-10 sm:py-14 transition-colors duration-500"
      :style="activeTabData ? `background: linear-gradient(to bottom right, ${darken(activeTabData.color, 30)}, ${activeTabData.color})` : ''"
      :class="!activeTabData ? 'bg-gradient-to-br from-red-700 via-red-600 to-red-500' : ''"
    >
      <div class="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
      <div class="absolute -bottom-20 -left-10 w-80 h-80 rounded-full bg-white/5 pointer-events-none" />

      <div class="relative max-w-2xl mx-auto text-center">
        <p class="text-white/80 text-sm font-medium mb-1">
          {{ greeting }}, <strong class="text-white">{{ firstName }}</strong> {{ greetingEmoji }}
        </p>
        <h1 class="text-3xl sm:text-4xl font-black text-white mb-5 leading-tight">
          {{ heroTitle }}
        </h1>

        <!-- Tabs (dynamic from API) -->
        <div class="inline-flex bg-white/15 backdrop-blur-sm rounded-2xl p-1 mb-5">
          <template v-if="searchTabs.length > 0">
            <button
              v-for="tab in searchTabs"
              :key="tab.key"
              class="px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200"
              :class="activeTab === tab.key ? 'bg-white shadow-sm' : 'text-white hover:bg-white/10'"
              :style="activeTab === tab.key ? `color: ${tab.color}` : ''"
              @click="setTab(tab.key)"
            >
              <span class="flex items-center gap-1.5">
                <svg v-if="tab.icon" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="tab.icon" />
                </svg>
                {{ tab.label }}
              </span>
            </button>
          </template>
          <!-- Skeleton genérico mientras cargan los tabs dinámicos -->
          <template v-else>
            <div v-for="n in 3" :key="n" class="px-5 py-2 rounded-xl">
              <div class="h-5 w-20 bg-white/20 rounded animate-pulse"></div>
            </div>
          </template>
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
              <p class="text-white/70 text-[11px] leading-none mt-0.5">
                {{ activeTab === 'productos' ? 'productos' : activeTab === 'servicios' ? 'servicios' : 'empleos' }}
              </p>
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
              <p class="text-white/70 text-[11px] leading-none mt-0.5">
                {{ activeTab === 'productos' ? 'comercios' : activeTab === 'servicios' ? 'proveedores' : 'empleadores' }}
              </p>
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
            :placeholder="activeTab === 'productos' ? 'Busca productos, comercios, categorías...' : activeTab === 'servicios' ? 'Busca servicios, categorías, proveedores...' : 'Busca empleos, categorías, empresas...'"
            class="w-full pl-12 pr-10 py-4 rounded-2xl text-sm text-gray-900 bg-white shadow-lg placeholder-gray-400 outline-none focus:ring-4 focus:ring-white/30 transition-all duration-200"
            @input="handleSearchInput"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
            @keyup.enter="handleSearchEnter"
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

          <!-- Sugerencias: búsquedas recientes -->
          <div
            v-if="showSuggestions"
            class="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-40 text-left"
          >
            <p class="px-4 pt-1 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Búsquedas recientes</p>
            <button
              v-for="item in recentSearchesForTab"
              :key="`${item.tab}-${item.term}`"
              class="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors group"
              @mousedown.prevent="applyRecentSearch(item.term)"
            >
              <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span class="flex-1 truncate text-left">{{ item.term }}</span>
              <span
                class="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 transition-opacity"
                @mousedown.prevent.stop="removeRecentSearch(item.term, item.tab)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </span>
            </button>
          </div>
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
            <button
              v-if="pFavorites.length > 0"
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
              :class="pShowFavoritesOnly ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="pShowFavoritesOnly = !pShowFavoritesOnly"
            >
              <svg class="w-3.5 h-3.5" :fill="pShowFavoritesOnly ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
              </svg>
              Favoritos
              <span class="opacity-60">({{ pFavorites.length }})</span>
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
          <template v-else-if="activeTab === 'servicios'">
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

          <!-- Tab Empleos -->
          <template v-else-if="activeTab === 'empleos'">
            <button
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
              :class="!jActiveCategoryId ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="jClearCategory"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
              Todos
            </button>
            <button
              v-if="suggestedJobCategory && jActiveCategoryId !== suggestedJobCategory.id"
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              :title="`Basado en tu rubro: ${userCategoryName}`"
              @click="jFilterByCategory(suggestedJobCategory.id)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
              </svg>
              Para ti: {{ suggestedJobCategory.name }}
            </button>
            <template v-if="jLoadingCategories">
              <div v-for="n in 5" :key="n" class="flex-shrink-0 h-8 w-24 bg-gray-100 rounded-xl animate-pulse" />
            </template>
            <button
              v-for="cat in jCategories"
              :key="cat.id"
              class="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
              :class="jActiveCategoryId === cat.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              :style="jActiveCategoryId === cat.id ? { backgroundColor: cat.color || '#10B981' } : {}"
              @click="jFilterByCategory(cat.id)"
            >
              <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: jActiveCategoryId === cat.id ? 'rgba(255,255,255,0.8)' : (cat.color || '#10B981') }" />
              {{ cat.name }}
              <span class="opacity-60">({{ cat.jobCount }})</span>
            </button>
          </template>

          <div class="flex-1 min-w-2"></div>

          <!-- Botón zona (abre selector país/estado/ciudad) -->
          <div ref="locationFilterRef" class="relative flex-shrink-0">
            <button
              class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
              :class="hasActiveLocationFilter
                ? (activeTab === 'productos' ? 'bg-red-600 text-white shadow-sm' : activeTab === 'servicios' ? 'bg-blue-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm')
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
              @click="locationFilterOpen = !locationFilterOpen"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Zona
            </button>
            <div v-if="locationFilterOpen" class="absolute right-0 top-full mt-2 w-72 z-40">
              <LocationFilter
                :model-country="activeLocationQuery.country"
                :model-state="activeLocationQuery.state"
                :model-city="activeLocationQuery.city"
                :accent="activeTab === 'productos' ? 'red' : activeTab === 'servicios' ? 'blue' : 'emerald'"
                @apply="onLocationApply"
              />
            </div>
          </div>

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
                Comercios
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
            <PriceRangeFilter
              :model-min="pQuery.priceMin"
              :model-max="pQuery.priceMax"
              accent="red"
              @apply="pApplyPriceRange"
            />
            <SortDropdown v-model="pSelectedSort" :options="sortOptions" accent="red" @update:model-value="pApplySort" />
            <button
              v-if="pActiveCategory || pActiveRestaurantId || (activeTab === 'productos' && searchInput)"
              class="w-full text-xs font-semibold text-red-600 py-2.5 px-4 rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
              @click="pResetFilters"
            >
              ✕ Limpiar filtros
            </button>
          </template>

          <!-- SIDEBAR SERVICIOS -->
          <template v-else-if="activeTab === 'servicios'">
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
            <SortDropdown v-model="sSelectedSort" :options="serviceSortOptions" accent="blue" @update:model-value="sApplySort" />
            <button
              v-if="sActiveCategoryId || sActiveProviderId || (activeTab === 'servicios' && searchInput)"
              class="w-full text-xs font-semibold text-blue-600 py-2.5 px-4 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors"
              @click="sResetFilters"
            >
              ✕ Limpiar filtros
            </button>
          </template>

          <!-- SIDEBAR EMPLEOS -->
          <template v-else-if="activeTab === 'empleos'">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Tipo de Empleo</h3>
              <div class="space-y-0.5">
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="!jActiveType ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jClearType"
                >Todos</button>
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="jActiveType === 'TIEMPO_COMPLETO' ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jFilterByType('TIEMPO_COMPLETO')"
                >Tiempo Completo</button>
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="jActiveType === 'MEDIO_TIEMPO' ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jFilterByType('MEDIO_TIEMPO')"
                >Medio Tiempo</button>
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="jActiveType === 'FREELANCE' ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jFilterByType('FREELANCE')"
                >Freelance</button>
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="jActiveType === 'TEMPORAL' ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jFilterByType('TEMPORAL')"
                >Temporal</button>
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="jActiveType === 'PRACTICAS' ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jFilterByType('PRACTICAS')"
                >Prácticas</button>
              </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wide mb-3">Modalidad</h3>
              <div class="space-y-0.5">
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="!jActiveModality ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jClearModality"
                >Todas</button>
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="jActiveModality === 'PRESENCIAL' ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jFilterByModality('PRESENCIAL')"
                >Presencial</button>
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="jActiveModality === 'REMOTO' ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jFilterByModality('REMOTO')"
                >Remoto</button>
                <button
                  class="w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors"
                  :class="jActiveModality === 'HIBRIDO' ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'text-gray-600 hover:bg-gray-50'"
                  @click="jFilterByModality('HIBRIDO')"
                >Híbrido</button>
              </div>
            </div>
            <SortDropdown v-model="jSelectedSort" :options="jobSortOptions" accent="emerald" @update:model-value="jApplySort" />
            <button
              v-if="jActiveCategoryId || jActiveType || jActiveModality || (activeTab === 'empleos' && searchInput)"
              class="w-full text-xs font-semibold text-emerald-600 py-2.5 px-4 rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-colors"
              @click="jResetFilters"
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

            <!-- Filtros activos -->
            <ActiveFilterChips :chips="pActiveChips" accent="red" @clear-all="pResetFilters" />

            <!-- Cerca de mí: tier label -->
            <div v-if="pLocationTierLabel" class="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2 mb-4">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {{ pLocationTierLabel }}
            </div>

            <!-- Vistos recientemente -->
            <div v-if="recentlyViewedForTab.length > 0" class="mb-4">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Vistos recientemente</p>
              <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <button
                  v-for="item in recentlyViewedForTab"
                  :key="`${item.type}-${item.id}`"
                  class="flex-shrink-0 flex items-center gap-2 bg-white border border-gray-100 rounded-xl shadow-sm pl-1.5 pr-3 py-1.5 hover:border-red-200 hover:shadow-md transition-all"
                  @click="openRecentlyViewed(item)"
                >
                  <div class="w-8 h-8 rounded-lg overflow-hidden bg-red-50 flex-shrink-0">
                    <img v-if="item.image" :src="imageSrc(item.image)" :alt="item.name" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-red-200">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                  </div>
                  <div class="text-left">
                    <p class="text-xs font-bold text-gray-800 line-clamp-1 max-w-[120px]">{{ item.name }}</p>
                    <p v-if="item.price" class="text-[11px] text-red-600 font-semibold">${{ formatPrice(item.price) }}</p>
                  </div>
                </button>
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
            <div v-else-if="pVisibleProducts.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path v-if="pShowFavoritesOnly" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
                  <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <p class="text-base font-bold text-gray-800 mb-1">Sin resultados</p>
              <p class="text-sm text-gray-400 mb-6">
                <span v-if="pShowFavoritesOnly">Aún no tienes productos favoritos</span>
                <span v-else>{{ searchInput ? `No hay productos para "${searchInput}"` : 'No hay productos con estos filtros' }}</span>
              </p>
              <button v-if="pShowFavoritesOnly" class="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors" @click="pShowFavoritesOnly = false">Ver todos los productos</button>
              <button v-else class="px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors" @click="pResetFilters">Ver todos los productos</button>
            </div>

            <!-- Grid -->
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              <CatalogProductCard
                v-for="product in pVisibleProducts" :key="product.id" :product="product"
                :isOwner="isOwnProduct(product)" :isFavorite="isFavorite(product.id)"
                @view="openProduct" @order="openOrderModal" @toggle-favorite="toggleFavorite"
              />
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
          <template v-else-if="activeTab === 'servicios'">

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

            <!-- Cerca de mí: tier label -->
            <div v-if="sLocationTierLabel" class="flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 mb-4">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {{ sLocationTierLabel }}
            </div>

            <!-- Vistos recientemente -->
            <div v-if="recentlyViewedForTab.length > 0" class="mb-4">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Vistos recientemente</p>
              <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <button
                  v-for="item in recentlyViewedForTab"
                  :key="`${item.type}-${item.id}`"
                  class="flex-shrink-0 flex items-center gap-2 bg-white border border-gray-100 rounded-xl shadow-sm pl-1.5 pr-3 py-1.5 hover:border-blue-200 hover:shadow-md transition-all"
                  @click="openRecentlyViewed(item)"
                >
                  <div class="w-8 h-8 rounded-lg overflow-hidden bg-blue-50 flex-shrink-0">
                    <img v-if="item.image" :src="imageSrc(item.image)" :alt="item.name" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-blue-200">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                    </div>
                  </div>
                  <div class="text-left">
                    <p class="text-xs font-bold text-gray-800 line-clamp-1 max-w-[120px]">{{ item.name }}</p>
                    <p v-if="item.subtitle" class="text-[11px] text-gray-400 line-clamp-1 max-w-[120px]">{{ item.subtitle }}</p>
                  </div>
                </button>
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
                        {{ defaultRate.symbol }} {{ (srv.price * defaultRate.rateToUsd).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
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

          <!-- ── TAB EMPLEOS ─────────────────────────────────────────────── -->
          <template v-else-if="activeTab === 'empleos'">

            <!-- Toolbar -->
            <div class="flex items-center justify-between mb-4 gap-3">
              <div>
                <p class="text-sm font-bold text-gray-800">
                  <span v-if="jLoading">Buscando...</span>
                  <span v-else><span class="text-emerald-600">{{ jTotal }}</span> {{ jTotal === 1 ? ' empleo disponible' : ' empleos disponibles' }}</span>
                </p>
                <p v-if="jActiveCategoryId || jActiveType || jActiveModality" class="text-xs text-gray-400 mt-0.5">
                  <span v-if="jActiveCategoryId">Categoría: <strong>{{ jCategories.find(c => c.id === jActiveCategoryId)?.name }}</strong></span>
                  <span v-if="jActiveType"> · Tipo: <strong>{{ jActiveType }}</strong></span>
                  <span v-if="jActiveModality"> · Modalidad: <strong>{{ jActiveModality }}</strong></span>
                </p>
              </div>
              <div class="lg:hidden">
                <select v-model="jSelectedSort" class="text-xs font-medium border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none" @change="jApplySort(jSelectedSort)">
                  <option v-for="opt in jobSortOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
            </div>

            <!-- Cerca de mí: tier label -->
            <div v-if="jLocationTierLabel" class="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-4">
              <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {{ jLocationTierLabel }}
            </div>

            <!-- Vistos recientemente -->
            <div v-if="recentlyViewedForTab.length > 0" class="mb-4">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Vistos recientemente</p>
              <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <button
                  v-for="item in recentlyViewedForTab"
                  :key="`${item.type}-${item.id}`"
                  class="flex-shrink-0 flex items-center gap-2 bg-white border border-gray-100 rounded-xl shadow-sm pl-1.5 pr-3 py-1.5 hover:border-emerald-200 hover:shadow-md transition-all"
                  @click="openRecentlyViewed(item)"
                >
                  <div class="w-8 h-8 rounded-lg overflow-hidden bg-emerald-50 flex-shrink-0 flex items-center justify-center text-emerald-200">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </div>
                  <div class="text-left">
                    <p class="text-xs font-bold text-gray-800 line-clamp-1 max-w-[120px]">{{ item.name }}</p>
                    <p v-if="item.subtitle" class="text-[11px] text-gray-400 line-clamp-1 max-w-[120px]">{{ item.subtitle }}</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- Error -->
            <div v-if="jError" class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
              <p class="text-sm font-semibold text-emerald-700 mb-3">{{ jError }}</p>
              <button class="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl" @click="jLoadJobs">Reintentar</button>
            </div>

            <!-- Skeleton -->
            <div v-else-if="jLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <div v-for="n in 6" :key="n" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div class="p-4 space-y-3">
                  <div class="h-5 bg-gray-200 rounded w-3/4" />
                  <div class="h-3 bg-gray-200 rounded w-full" />
                  <div class="h-3 bg-gray-200 rounded w-2/3" />
                  <div class="flex items-center gap-2 mt-3">
                    <div class="h-8 w-8 bg-gray-200 rounded-full" />
                    <div class="h-3 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Vacío -->
            <div v-else-if="jJobs.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
              <div class="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <p class="text-base font-bold text-gray-800 mb-1">Sin empleos disponibles</p>
              <p class="text-sm text-gray-400 mb-6">{{ searchInput ? `No hay empleos para "${searchInput}"` : 'No hay empleos con estos filtros' }}</p>
              <button class="px-5 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors" @click="jResetFilters">Ver todos los empleos</button>
            </div>

            <!-- Grid empleos -->
            <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <div
                v-for="job in jJobs"
                :key="job.id"
                class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
                @click="openJob(job)"
              >
                <div class="p-4">
                  <!-- Categoría -->
                  <div v-if="job.category" class="mb-3">
                    <span class="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" :style="{ backgroundColor: job.category.color || '#10B981' }">
                      {{ job.category.name }}
                    </span>
                  </div>

                  <!-- Título y descripción -->
                  <h3 class="font-bold text-gray-900 text-sm mb-2 line-clamp-1">{{ job.title }}</h3>
                  <p class="text-xs text-gray-500 mb-3 line-clamp-2">{{ job.description }}</p>

                  <!-- Empleador -->
                  <div class="flex items-center gap-2 mb-3">
                    <div class="w-7 h-7 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0">
                      <img v-if="job.employer.avatar" :src="avatarSrc(job.employer.avatar)" :alt="job.employer.firstName" class="w-full h-full object-cover" />
                      <span v-else class="w-full h-full flex items-center justify-center text-[10px] font-bold text-emerald-600">
                        {{ job.employer.firstName[0] }}{{ job.employer.lastName[0] }}
                      </span>
                    </div>
                    <span class="text-xs text-gray-500 truncate">{{ job.employer.firstName }} {{ job.employer.lastName }}</span>
                  </div>

                  <!-- Tags de tipo y modalidad -->
                  <div class="flex flex-wrap gap-1 mb-3">
                    <span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{{ job.type.replace('_', ' ') }}</span>
                    <span class="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium">{{ job.modality }}</span>
                    <span v-if="job.experienceLevel" class="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full font-medium">{{ job.experienceLevel }}</span>
                  </div>

                  <!-- Ubicación -->
                  <div v-if="job.location" class="flex items-center gap-1 text-xs text-gray-400 mb-3">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    {{ job.location }}
                  </div>

                  <!-- Salario -->
                  <div v-if="job.salaryMin || job.salaryMax" class="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div class="text-emerald-600 font-black text-sm">
                      <span v-if="job.salaryMin">${{ formatPrice(job.salaryMin) }}</span>
                      <span v-if="job.salaryMin && job.salaryMax"> - </span>
                      <span v-if="job.salaryMax">${{ formatPrice(job.salaryMax) }}</span>
                      <span v-if="job.salaryCurrency" class="text-xs font-normal text-gray-400 ml-0.5">{{ job.salaryCurrency }}</span>
                    </div>
                    <div v-if="job._count?.applications !== undefined" class="text-xs text-gray-400">
                      {{ job._count.applications }} aplicaciones
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Paginación empleos -->
            <div v-if="jTotalPages > 1" class="flex items-center justify-center gap-1.5 mt-8">
              <button class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="jCurrentPage <= 1" @click="jChangePage(jCurrentPage - 1)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <template v-for="page in jVisiblePages" :key="String(page)">
                <span v-if="page === '...'" class="w-9 h-9 flex items-center justify-center text-xs text-gray-400">…</span>
                <button v-else class="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all"
                  :class="page === jCurrentPage ? 'bg-emerald-600 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'"
                  @click="jChangePage(page as number)">{{ page }}</button>
              </template>
              <button class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                :disabled="jCurrentPage >= jTotalPages" @click="jChangePage(jCurrentPage + 1)">
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
          :class="activeTab === 'productos' ? 'hover:bg-red-600' : activeTab === 'servicios' ? 'hover:bg-blue-600' : 'hover:bg-emerald-600'"
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
                  <div class="text-right flex-shrink-0">
                    <span class="text-2xl font-black text-red-600">${{ formatPrice(selectedProduct.price) }}</span>
                    <div v-if="defaultRate && selectedProduct.price" class="text-xs text-gray-500">
                      {{ defaultRate.symbol }} {{ (selectedProduct.price * defaultRate.rateToUsd).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </div>
                  </div>
                </div>
                <p v-if="selectedProduct.description" class="text-sm text-gray-500 mb-4 leading-relaxed">{{ selectedProduct.description }}</p>
                <div class="flex flex-wrap gap-2 mb-4">
                  <NuxtLink v-if="selectedProduct.commerce.user?.username"
                    :to="`/p/${selectedProduct.commerce.user.username}`"
                    class="flex items-center gap-1.5 text-xs font-medium bg-red-50 text-red-600 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-colors"
                    @click="selectedProduct = null">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                    {{ selectedProduct.commerce.name }}
                  </NuxtLink>
                  <span v-else class="flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-700 px-3 py-1.5 rounded-xl">
                    <svg class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/></svg>
                    {{ selectedProduct.commerce.name }}
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
                <img v-if="selectedService.image" :src="imageSrc(selectedService.image)" :alt="selectedService.name" class="w-full h-full object-cover" />
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
                    <div v-if="defaultRate && selectedService.price" class="text-xs text-gray-500">
                      {{ defaultRate.symbol }} {{ (selectedService.price * defaultRate.rateToUsd).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                    </div>
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
                  <!-- Rating del proveedor -->
                  <div class="flex items-center gap-1">
                    <div class="flex items-center gap-0.5">
                      <template v-for="n in 5" :key="n">
                        <svg class="w-3.5 h-3.5" :class="n <= Math.round(selectedService.user.rating ?? 0) ? 'text-amber-400' : 'text-gray-200'" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      </template>
                    </div>
                    <span v-if="selectedService.user.rating" class="text-xs font-semibold text-gray-600">{{ selectedService.user.rating.toFixed(1) }}</span>
                    <span v-else class="text-xs text-gray-400">Sin reseñas</span>
                    <span v-if="selectedService.user.reviewsCount > 0" class="text-[11px] text-gray-400">({{ selectedService.user.reviewsCount }})</span>
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
                    class="flex-shrink-0 text-xs font-semibold text-blue-600 py-2.5 px-4 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors"
                    @click="trackProfileVisit(selectedService!)">
                    Ver perfil
                  </NuxtLink>
                  <button
                    v-if="!isOwnService(selectedService!)"
                    class="flex-1 py-2.5 bg-blue-600 text-white text-sm font-black rounded-xl hover:bg-blue-700 active:scale-95 transition-all duration-200 shadow-sm shadow-blue-200"
                    @click="openServiceRequestModal(selectedService!)">
                    Solicitar Servicio
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

      <!-- Modal empleo -->
      <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100"
        leave-active-class="duration-200 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="selectedJob" class="fixed inset-0 z-[200] flex items-center justify-center p-4" @click.self="selectedJob = null">
          <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="selectedJob = null" />
          <Transition enter-active-class="duration-300 ease-out" enter-from-class="opacity-0 scale-95 translate-y-4" enter-to-class="opacity-100 scale-100 translate-y-0">
            <div v-if="selectedJob" class="relative bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div class="relative aspect-video bg-emerald-50 rounded-t-3xl overflow-hidden">
                <div class="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                  <svg class="w-16 h-16 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                      d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <div v-if="selectedJob.category" class="absolute top-3 left-3">
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full text-white shadow" :style="{ backgroundColor: selectedJob.category.color || '#10B981' }">{{ selectedJob.category.name }}</span>
                </div>
                <button class="absolute top-3 right-3 w-8 h-8 rounded-xl bg-black/30 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/50 transition-colors" @click="selectedJob = null">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div class="p-5">
                <div class="flex items-start justify-between gap-3 mb-2">
                  <h2 class="text-xl font-black text-gray-900 leading-tight">{{ selectedJob.title }}</h2>
                  <div v-if="selectedJob.salaryMin || selectedJob.salaryMax" class="text-right flex-shrink-0">
                    <div class="text-emerald-600 font-black text-base">
                      <span v-if="selectedJob.salaryMin">${{ formatPrice(selectedJob.salaryMin) }}</span>
                      <span v-if="selectedJob.salaryMin && selectedJob.salaryMax"> - </span>
                      <span v-if="selectedJob.salaryMax">${{ formatPrice(selectedJob.salaryMax) }}</span>
                    </div>
                    <p v-if="selectedJob.salaryCurrency" class="text-xs text-gray-400">{{ selectedJob.salaryCurrency }}</p>
                  </div>
                </div>
                <p v-if="selectedJob.description" class="text-sm text-gray-500 mb-4 leading-relaxed">{{ selectedJob.description }}</p>

                <!-- Empleador -->
                <div class="flex items-center gap-2 w-full mb-4">
                  <div class="w-8 h-8 rounded-full overflow-hidden bg-emerald-100 flex-shrink-0">
                    <img v-if="selectedJob.employer.avatar" :src="avatarSrc(selectedJob.employer.avatar)" :alt="selectedJob.employer.firstName" class="w-full h-full object-cover" />
                    <span v-else class="w-full h-full flex items-center justify-center text-xs font-bold text-emerald-600">
                      {{ selectedJob.employer.firstName[0] }}{{ selectedJob.employer.lastName[0] }}
                    </span>
                  </div>
                  <div>
                    <p class="text-sm font-semibold text-gray-800">{{ selectedJob.employer.firstName }} {{ selectedJob.employer.lastName }}</p>
                    <p v-if="selectedJob.employer.category" class="text-xs text-gray-400">{{ selectedJob.employer.subcategory?.name ?? selectedJob.employer.category.name }}</p>
                  </div>
                </div>

                <!-- Tags de tipo, modalidad, experiencia -->
                <div class="flex flex-wrap gap-1.5 mb-4">
                  <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-100">{{ selectedJob.type.replace('_', ' ') }}</span>
                  <span class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-100">{{ selectedJob.modality }}</span>
                  <span v-if="selectedJob.experienceLevel" class="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full font-medium border border-emerald-100">{{ selectedJob.experienceLevel }}</span>
                </div>

                <!-- Ubicación -->
                <div v-if="selectedJob.location" class="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  {{ selectedJob.location }}
                </div>

                <!-- Tags -->
                <div v-if="selectedJob.tags.length" class="flex flex-wrap gap-1.5 mb-4">
                  <span v-for="tag in selectedJob.tags" :key="tag" class="text-xs px-2.5 py-1 bg-gray-50 text-gray-500 rounded-full font-medium border border-gray-100">{{ tag }}</span>
                </div>

                <div class="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <NuxtLink v-if="selectedJob.employer.username" :to="`/p/${selectedJob.employer.username}`"
                    class="flex-shrink-0 text-xs font-semibold text-emerald-600 py-2.5 px-4 rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-colors">
                    Ver perfil
                  </NuxtLink>
                  <span v-if="selectedJob._count?.applications !== undefined" class="flex-1 text-center text-xs text-gray-400">
                    {{ selectedJob._count.applications }} aplicaciones
                  </span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>

      <!-- Modal pedido individual -->
      <ModalsCatalogOrderModal v-model="showOrderModal" :product="orderProduct" @success="onOrderSuccess" />

      <!-- Modal solicitud de servicio -->
      <ModalsCatalogServiceRequestModal v-model="showServiceRequestModal" :service="serviceRequestTarget" @success="onServiceRequestSuccess" />

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
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CatalogProduct, CatalogSortBy } from '~/composables/useCatalog'
import type { CatalogService } from '~/composables/useServices'
import type { Job } from '~/composables/useJobs'
import { useJobs } from '~/composables/useJobs'
import { useExchangeRates } from '~/composables/useExchangeRates'
import { useCart } from '~/composables/useCart'
import { useSearchTabs } from '~/composables/useSearchTabs'
import { useCatalogFilters } from '~/composables/useCatalogFilters'
import PriceRangeFilter from '~/components/search/PriceRangeFilter.vue'
import SortDropdown from '~/components/search/SortDropdown.vue'
import ActiveFilterChips from '~/components/search/ActiveFilterChips.vue'
import LocationFilter from '~/components/search/LocationFilter.vue'

definePageMeta({ layout: 'default' })

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string

// ─── Carrito ──────────────────────────────────────────────────────────────────
const { totalItems: cartTotalItems, totalPrice: cartTotalPrice, openCart } = useCart()

// ─── Productos ────────────────────────────────────────────────────────────────
const {
  products: pProducts, categories: pCategories, restaurants: pRestaurants,
  loading: pLoading, loadingCategories: pLoadingCategories,
  error: pError, total: pTotal, totalPages: pTotalPages, query: pQuery,
  locationTier: pLocationTier,
  loadCategories: pLoadCategories, loadRestaurants: pLoadRestaurants, loadProducts: pLoadProducts,
  search: pSearch, filterByCategory: pFilterByCategory, filterByRestaurant: pFilterByRestaurant,
  filterByPriceRange: pFilterByPriceRange,
  changePage: pChangePage, changeSort: pChangeSort, resetFilters: pResetFilters, toggleNearMe: pToggleNearMe,
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
  changePage: sChangePage, changeSort: sChangeSort, resetFilters: sResetFilters, toggleNearMe: sToggleNearMe,
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
  changePage: jChangePage, changeSort: jChangeSort, resetFilters: jResetFilters, toggleNearMe: jToggleNearMe,
  filterByLocation: jFilterByLocation,
} = useJobs()

const { getHeaders } = useAuth()

const { user } = useAuth()

// Obtener tasa de cambio para conversión
const { defaultRate, fetchRates } = useExchangeRates()

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
const selectedJob = ref<Job | null>(null)
const showScrollTop = ref(false)
const showOrderModal = ref(false)
const orderProduct = ref<CatalogProduct | null>(null)
const orderToast = ref(false)
const showServiceRequestModal = ref(false)
const serviceRequestTarget = ref<CatalogService | null>(null)
const serviceToast = ref(false)
const pShowFavoritesOnly = ref(false)
const locationFilterOpen = ref(false)
const locationFilterRef = ref<HTMLElement | null>(null)

const pSelectedSort = ref<CatalogSortBy>('relevance')
const sSelectedSort = ref<'relevance' | 'price_asc' | 'price_desc' | 'name' | 'newest'>('relevance')
const jSelectedSort = ref<'relevance' | 'newest' | 'salary_asc' | 'salary_desc'>('relevance')

const sortOptions = [
  { value: 'relevance' as const, label: 'Relevancia' },
  { value: 'price_asc' as const, label: 'Menor precio' },
  { value: 'price_desc' as const, label: 'Mayor precio' },
  { value: 'name' as const, label: 'Nombre A-Z' },
  { value: 'rating_desc' as const, label: 'Mejor calificados' },
  { value: 'best_seller' as const, label: 'Más vendidos' },
]
const serviceSortOptions = [
  { value: 'relevance' as const, label: 'Relevancia' },
  { value: 'newest' as const, label: 'Más recientes' },
  { value: 'price_asc' as const, label: 'Menor precio' },
  { value: 'price_desc' as const, label: 'Mayor precio' },
  { value: 'name' as const, label: 'Nombre A-Z' },
]
const jobSortOptions = [
  { value: 'relevance' as const, label: 'Relevancia' },
  { value: 'newest' as const, label: 'Más recientes' },
  { value: 'salary_asc' as const, label: 'Menor salario' },
  { value: 'salary_desc' as const, label: 'Mayor salario' },
]

// ─── Filtros activos (chips) ───────────────────────────────────────────────────
const { activeChips: pActiveChips } = useCatalogFilters({
  query: pQuery,
  categories: pCategories,
  restaurants: pRestaurants,
  searchInput,
  filterByCategory: pFilterByCategory,
  filterByRestaurant: pFilterByRestaurant,
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
  locationFilterOpen.value = false
}

// ─── Computed ─────────────────────────────────────────────────────────────────
const firstName = computed(() => user.value?.firstName || 'Usuario')

const activeTabData = computed(() =>
  searchTabs.value.find(t => t.key === activeTab.value) ?? null,
)

const heroTitle = computed(() => {
  if (activeTab.value === 'productos') return '¿Qué vas a pedir hoy?'
  if (activeTab.value === 'servicios') return '¿Qué servicio necesitas?'
  if (activeTab.value === 'empleos') return '¿Buscas trabajo?'
  return activeTabData.value ? `Busca ${activeTabData.value.label.toLowerCase()}` : '¿Qué buscas hoy?'
})

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
const pCurrentPage = computed(() => pQuery.value.page)
const pActiveCategory = computed(() => pQuery.value.categoryName)
const pActiveRestaurantId = computed(() => pQuery.value.commerceId)
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
const RECENT_SEARCHES_KEY = 'search_recent'
const MAX_RECENT_SEARCHES = 6
interface RecentSearch { term: string; tab: string }
const recentSearches = ref<RecentSearch[]>([])

function loadRecentSearches() {
  if (!process.client) return
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    recentSearches.value = stored ? JSON.parse(stored) : []
  } catch {
    recentSearches.value = []
  }
}

function saveRecentSearches() {
  if (!process.client) return
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches.value))
}

function addRecentSearch(term: string) {
  const trimmed = term.trim()
  if (!trimmed) return
  recentSearches.value = [
    { term: trimmed, tab: activeTab.value },
    ...recentSearches.value.filter(s => s.term.toLowerCase() !== trimmed.toLowerCase() || s.tab !== activeTab.value),
  ].slice(0, MAX_RECENT_SEARCHES)
  saveRecentSearches()
}

function removeRecentSearch(term: string, tab: string) {
  recentSearches.value = recentSearches.value.filter(s => !(s.term === term && s.tab === tab))
  saveRecentSearches()
}

const recentSearchesForTab = computed(() =>
  recentSearches.value.filter(s => s.tab === activeTab.value),
)

const showSuggestions = computed(() =>
  searchFocused.value && !searchInput.value && recentSearchesForTab.value.length > 0,
)

function applyRecentSearch(term: string) {
  searchInput.value = term
  searchFocused.value = false
  if (activeTab.value === 'productos') pSearch(term)
  else if (activeTab.value === 'servicios') sSearch(term)
  else jSearch(term)
  addRecentSearch(term)
}

if (process.client) loadRecentSearches()

// ─── Vistos recientemente ───────────────────────────────────────────────────────
const RECENTLY_VIEWED_KEY = 'search_recently_viewed'
const MAX_RECENTLY_VIEWED = 12
interface RecentlyViewedItem {
  type: 'producto' | 'servicio' | 'empleo'
  id: string
  name: string
  image?: string | null
  subtitle?: string
  price?: number | null
}
const recentlyViewed = ref<RecentlyViewedItem[]>([])

function loadRecentlyViewed() {
  if (!process.client) return
  try {
    const stored = localStorage.getItem(RECENTLY_VIEWED_KEY)
    recentlyViewed.value = stored ? JSON.parse(stored) : []
  } catch {
    recentlyViewed.value = []
  }
}

function saveRecentlyViewed() {
  if (!process.client) return
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(recentlyViewed.value))
}

function addRecentlyViewed(item: RecentlyViewedItem) {
  recentlyViewed.value = [
    item,
    ...recentlyViewed.value.filter(v => !(v.type === item.type && v.id === item.id)),
  ].slice(0, MAX_RECENTLY_VIEWED)
  saveRecentlyViewed()
}

const recentlyViewedForTab = computed(() => {
  const tabType = activeTab.value === 'productos' ? 'producto' : activeTab.value === 'servicios' ? 'servicio' : 'empleo'
  return recentlyViewed.value.filter(v => v.type === tabType)
})

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

if (process.client) loadRecentlyViewed()

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

watch([activeTab, pTotal, sTotal, jTotal, () => pRestaurants.value.length, () => sProviders.value.length], () => {
  if (activeTab.value === 'productos') {
    animateCounter(displayCount, pTotal.value)
    animateCounter(displayGroups, pRestaurants.value.length)
  } else if (activeTab.value === 'servicios') {
    animateCounter(displayCount, sTotal.value)
    animateCounter(displayGroups, sProviders.value.length)
  } else {
    animateCounter(displayCount, jTotal.value)
    animateCounter(displayGroups, jJobs.value.length > 0 ? [...new Set(jJobs.value.map(j => j.employer.id))].length : 0)
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
const jVisiblePages = computed(() => buildVisiblePages(jCurrentPage.value, jTotalPages.value))

// ─── Helpers ──────────────────────────────────────────────────────────────────
function avatarSrc(avatar: string) {
  if (avatar.startsWith('http')) return avatar
  return `${apiUrl}${avatar}`
}

function imageSrc(image: string) {
  if (image.startsWith('http')) return image
  return `${apiUrl}${image}`
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

// ─── Acciones ─────────────────────────────────────────────────────────────────
function setTab(tab: string) {
  activeTab.value = tab
  searchInput.value = ''
}

function handleSearchInput() {
  if (activeTab.value === 'productos') pSearch(searchInput.value)
  else if (activeTab.value === 'servicios') sSearch(searchInput.value)
  else jSearch(searchInput.value)
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

function pClearCategory() { if (pActiveCategory.value) pFilterByCategory(pActiveCategory.value) }
function pClearRestaurant() { if (pActiveRestaurantId.value) pFilterByRestaurant(pActiveRestaurantId.value) }
function pApplySort(val: string) { pSelectedSort.value = val as CatalogSortBy; pChangeSort(val as CatalogSortBy) }
function pApplyPriceRange(min: number | null, max: number | null) { pFilterByPriceRange(min, max) }

function sClearCategory() { sFilterByCategory(null) }
function sClearProvider() { sFilterByProvider(null) }
function sApplySort(val: string) { sSelectedSort.value = val as typeof sSelectedSort.value; sChangeSort(val as typeof sSelectedSort.value) }
function jClearCategory() { jFilterByCategory(null) }
function jClearType() { jFilterByType(null) }
function jClearModality() { jFilterByModality(null) }
function jApplySort(val: string) { jSelectedSort.value = val as typeof jSelectedSort.value; jChangeSort(val as typeof jSelectedSort.value) }

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
    trackServiceEvent(srv.id, 'VIEW', getHeaders())
  }
  addRecentlyViewed({
    type: 'servicio',
    id: srv.id,
    name: srv.name,
    image: srv.image,
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
function openOrderModal(product: CatalogProduct) { orderProduct.value = product; showOrderModal.value = true }
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
    trackServiceEvent(serviceRequestTarget.value.id, 'REQUEST', getHeaders())
  }
}
function trackProfileVisit(srv: CatalogService) {
  if (!isOwnService(srv)) {
    trackServiceEvent(srv.id, 'PROFILE_VISIT', getHeaders())
  }
}

function handleScroll() { showScrollTop.value = window.scrollY > 400 }
function handleClickOutsideLocation(e: MouseEvent) {
  if (locationFilterOpen.value && locationFilterRef.value && !locationFilterRef.value.contains(e.target as Node)) {
    locationFilterOpen.value = false
  }
}
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) }

// ─── Lifecycle ────────────────────────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  document.addEventListener('click', handleClickOutsideLocation)
  await Promise.all([
    loadSearchTabs(),
    pLoadCategories(), pLoadRestaurants(), pLoadProducts(),
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
    searchInput.value = qFromQuery
    handleSearchInput()
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
  document.removeEventListener('click', handleClickOutsideLocation)
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
