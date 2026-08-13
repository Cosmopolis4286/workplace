<template>
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
            @click="$emit('set-tab', tab.key)"
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
          :value="searchInput"
          type="text"
          :placeholder="activeTab === 'productos' ? 'Busca productos, comercios, categorías...' : activeTab === 'servicios' ? 'Busca servicios, categorías, proveedores...' : 'Busca empleos, categorías, empresas...'"
          class="w-full pl-12 pr-10 py-4 rounded-2xl text-sm text-gray-900 bg-white shadow-lg placeholder-gray-400 outline-none focus:ring-4 focus:ring-white/30 transition-all duration-200"
          @input="$emit('update:search-input', ($event.target as HTMLInputElement).value)"
          @focus="$emit('focus')"
          @blur="$emit('blur')"
          @keyup.enter="$emit('enter')"
        />
        <button
          v-if="searchInput"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
          @click="$emit('clear')"
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
            @mousedown.prevent="$emit('apply-recent-search', item.term)"
          >
            <svg class="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span class="flex-1 truncate text-left">{{ item.term }}</span>
            <span
              class="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-200 text-gray-400 transition-opacity"
              @mousedown.prevent.stop="$emit('remove-recent-search', item.term, item.tab)"
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
</template>

<script setup lang="ts">
import type { SearchTab } from '~/composables/search/useSearchTabs'
import type { RecentSearch } from '~/composables/search/useRecentSearches'

defineProps<{
  activeTab: string
  activeTabData: SearchTab | null
  searchTabs: SearchTab[]
  firstName: string
  heroTitle: string
  greeting: string
  greetingEmoji: string
  displayCount: number
  displayGroups: number
  searchInput: string
  showSuggestions: boolean
  recentSearchesForTab: RecentSearch[]
}>()

defineEmits<{
  'set-tab': [tab: string]
  'update:search-input': [value: string]
  focus: []
  blur: []
  enter: []
  clear: []
  'apply-recent-search': [term: string]
  'remove-recent-search': [term: string, tab: string]
}>()

function darken(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (n >> 16) - amount)
  const g = Math.max(0, ((n >> 8) & 0xff) - amount)
  const b = Math.max(0, (n & 0xff) - amount)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
</script>
