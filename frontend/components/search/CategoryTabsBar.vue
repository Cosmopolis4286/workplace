<template>
  <div class="bg-white border-b border-gray-100 sticky top-14 sm:top-16 z-30 shadow-sm">
    <div class="max-w-6xl mx-auto px-3 sm:px-6">
      <div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-2.5 sm:py-3 scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0">

        <!-- Tab Productos -->
        <template v-if="activeTab === 'productos'">
          <button
            class="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
            :class="!pActiveCategory ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            @click="$emit('p-clear-category')"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            Todos
          </button>
          <button
            v-if="pFavorites.length > 0"
            class="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
            :class="pShowFavoritesOnly ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            @click="$emit('update:p-show-favorites-only', !pShowFavoritesOnly)"
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
            class="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
            :class="pActiveCategory === cat.name ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            :style="pActiveCategory === cat.name ? { backgroundColor: cat.color } : {}"
            @click="$emit('p-filter-by-category', cat.name)"
          >
            <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: pActiveCategory === cat.name ? 'rgba(255,255,255,0.8)' : cat.color }" />
            {{ cat.name }}
            <span class="opacity-60">({{ cat.productCount }})</span>
          </button>
        </template>

        <!-- Tab Servicios -->
        <template v-else-if="activeTab === 'servicios'">
          <button
            class="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
            :class="!sActiveCategoryId ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            @click="$emit('s-clear-category')"
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
            class="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
            :class="sActiveCategoryId === cat.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            :style="sActiveCategoryId === cat.id ? { backgroundColor: cat.color || '#3B82F6' } : {}"
            @click="$emit('s-filter-by-category', cat.id)"
          >
            <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: sActiveCategoryId === cat.id ? 'rgba(255,255,255,0.8)' : (cat.color || '#3B82F6') }" />
            {{ cat.name }}
            <span class="opacity-60">({{ cat.serviceCount }})</span>
          </button>
        </template>

        <!-- Tab Empleos -->
        <template v-else-if="activeTab === 'empleos'">
          <button
            class="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
            :class="!jActiveCategoryId ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            @click="$emit('j-clear-category')"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            Todos
          </button>
          <button
            v-if="suggestedJobCategory && jActiveCategoryId !== suggestedJobCategory.id"
            class="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            :title="`Basado en tu rubro: ${userCategoryName}`"
            @click="$emit('j-filter-by-category', suggestedJobCategory.id)"
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
            class="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
            :class="jActiveCategoryId === cat.id ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
            :style="jActiveCategoryId === cat.id ? { backgroundColor: cat.color || '#10B981' } : {}"
            @click="$emit('j-filter-by-category', cat.id)"
          >
            <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: jActiveCategoryId === cat.id ? 'rgba(255,255,255,0.8)' : (cat.color || '#10B981') }" />
            {{ cat.name }}
            <span class="opacity-60">({{ cat.jobCount }})</span>
          </button>
        </template>

        <button
          v-if="canProposeCategory"
          class="flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700"
          @click="$emit('open-propose-category')"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
          </svg>
          Proponer categoría
        </button>

        <div class="flex-1 min-w-2"></div>

        <!-- Botón zona (abre selector país/estado/ciudad) -->
        <div ref="locationFilterRef" class="relative flex-shrink-0">
          <button
            class="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap"
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
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import LocationFilter from '~/components/search/LocationFilter.vue'
import type { CatalogCategory } from '~/composables/catalog/useCatalog'
import type { ServiceCategory } from '~/composables/services/useServices'
import type { JobCategory } from '~/composables/jobs/useJobs'

const props = defineProps<{
  activeTab: string
  canProposeCategory: boolean

  pActiveCategory: string | null
  pCategories: readonly CatalogCategory[]
  pLoadingCategories: boolean
  pFavorites: readonly string[]
  pShowFavoritesOnly: boolean

  sActiveCategoryId: string | null
  sCategories: ServiceCategory[]
  sLoadingCategories: boolean

  jActiveCategoryId: string | null
  jCategories: JobCategory[]
  jLoadingCategories: boolean
  suggestedJobCategory: JobCategory | null
  userCategoryName: string | null

  hasActiveLocationFilter: boolean
  activeLocationQuery: { country: string; state: string; city: string }
}>()

const emit = defineEmits<{
  'p-clear-category': []
  'update:p-show-favorites-only': [value: boolean]
  'p-filter-by-category': [name: string]
  's-clear-category': []
  's-filter-by-category': [id: string]
  'j-clear-category': []
  'j-filter-by-category': [id: string]
  'open-propose-category': []
  'apply-location': [country: string, state: string, city: string]
}>()

const locationFilterOpen = ref(false)
const locationFilterRef = ref<HTMLElement | null>(null)

function handleClickOutside(e: MouseEvent) {
  if (locationFilterOpen.value && locationFilterRef.value && !locationFilterRef.value.contains(e.target as Node)) {
    locationFilterOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

function onLocationApply(country: string, state: string, city: string) {
  emit('apply-location', country, state, city)
  locationFilterOpen.value = false
}
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
