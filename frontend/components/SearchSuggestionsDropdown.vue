<template>
  <div
    :class="[
      staticPosition ? 'mt-2' : 'absolute left-0 right-0 mt-2 rounded-2xl shadow-2xl border z-50 max-h-[28rem] overflow-y-auto',
      !staticPosition && (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'),
    ]"
  >
    <!-- Vacío: búsquedas recientes -->
    <div v-if="!query || query.trim().length < 2">
      <template v-if="recentTerms.length > 0">
        <p class="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          Búsquedas recientes
        </p>
        <button
          v-for="term in recentTerms"
          :key="term"
          class="w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors group"
          :class="isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'"
          @click="$emit('recent-select', term)"
        >
          <ClockIcon class="h-4 w-4 flex-shrink-0" :class="isDark ? 'text-gray-500' : 'text-gray-300'" />
          <span class="flex-1 truncate text-sm" :class="isDark ? 'text-gray-200' : 'text-gray-700'">{{ term }}</span>
          <span
            class="opacity-0 group-hover:opacity-100 p-1 rounded-lg flex-shrink-0 transition-opacity"
            :class="isDark ? 'hover:bg-white/10 text-gray-500' : 'hover:bg-gray-200 text-gray-400'"
            @click.stop="$emit('recent-remove', term)"
          >
            <XMarkIcon class="h-3.5 w-3.5" />
          </span>
        </button>
      </template>
      <div v-else class="px-4 py-6 text-center text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
        Escribe al menos 2 letras para buscar…
      </div>
    </div>

    <!-- Loading -->
    <div v-else-if="loading && suggestions.length === 0" class="px-4 py-3 space-y-2">
      <div v-for="i in 3" :key="i" class="flex items-center gap-3 h-12 px-1">
        <div class="h-9 w-9 rounded-lg animate-pulse flex-shrink-0" :class="isDark ? 'bg-gray-700' : 'bg-gray-100'" />
        <div class="flex-1 space-y-1.5">
          <div class="h-3 rounded animate-pulse w-3/4" :class="isDark ? 'bg-gray-700' : 'bg-gray-100'" />
          <div class="h-2.5 rounded animate-pulse w-1/2" :class="isDark ? 'bg-gray-700' : 'bg-gray-100'" />
        </div>
      </div>
    </div>

    <!-- Sin resultados -->
    <div v-else-if="!loading && suggestions.length === 0" class="px-4 py-8 text-center">
      <MagnifyingGlassIcon class="h-7 w-7 mx-auto mb-2" :class="isDark ? 'text-gray-600' : 'text-gray-300'" />
      <p class="text-sm font-medium" :class="isDark ? 'text-gray-400' : 'text-gray-500'">Sin resultados para "{{ query }}"</p>
      <p class="text-xs mt-0.5" :class="isDark ? 'text-gray-500' : 'text-gray-400'">Intenta con otras palabras o revisa la ortografía</p>
    </div>

    <!-- Resultados agrupados por tab -->
    <template v-else>
      <div v-for="group in groupedSuggestions" :key="group.tab" class="py-1.5">
        <p class="px-4 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide flex items-center justify-between" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          <span>{{ TAB_LABELS[group.tab] }}</span>
          <span v-if="countFor(group.tab) > group.items.length" class="font-normal">{{ countFor(group.tab) }} resultados</span>
        </p>
        <button
          v-for="s in group.items"
          :key="s.id"
          class="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
          :class="isItemHighlighted(s) ? (isDark ? 'bg-white/10' : 'bg-gray-100') : (isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50')"
          @mouseenter="$emit('hover', flatIndex(s))"
          @click="$emit('select', s)"
        >
          <div class="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" :class="isDark ? 'bg-gray-700' : 'bg-gray-100'">
            <img v-if="s.image" :src="resolveImage(s.image)" alt="" class="h-full w-full object-cover">
            <component :is="TAB_ICONS[group.tab]" v-else class="h-4 w-4" :class="isDark ? 'text-gray-500' : 'text-gray-400'" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate" :class="isDark ? 'text-gray-100' : 'text-gray-800'">{{ s.title }}</p>

            <p v-if="s.providerName" class="text-xs truncate" :class="isDark ? 'text-gray-500' : 'text-gray-400'">{{ s.providerName }}</p>

            <div class="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span
                v-if="s.category"
                class="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                :style="{ backgroundColor: s.category.color || '#6b7280' }"
              >
                {{ s.category.name }}
              </span>
              <span v-else-if="s.subtitle" class="text-xs truncate" :class="isDark ? 'text-gray-500' : 'text-gray-400'">{{ s.subtitle }}</span>

              <span v-if="s.rating" class="flex items-center gap-0.5 text-[11px] font-medium flex-shrink-0" :class="isDark ? 'text-amber-400' : 'text-amber-500'">
                <StarIcon class="h-3 w-3" />
                {{ s.rating.toFixed(1) }}
                <span v-if="s.reviewsCount" class="font-normal" :class="isDark ? 'text-gray-500' : 'text-gray-400'">({{ s.reviewsCount }})</span>
              </span>

              <span v-if="s.nearYou" class="flex items-center gap-0.5 text-[10px] font-semibold flex-shrink-0" :class="isDark ? 'text-blue-400' : 'text-blue-600'">
                <MapPinIcon class="h-3 w-3" />
                Cerca de ti
              </span>
            </div>

            <span v-if="s.lowStock" class="inline-flex items-center gap-0.5 mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              <ExclamationTriangleIcon class="h-3 w-3" />
              Pocas unidades
            </span>
          </div>

          <div class="flex-shrink-0 text-right">
            <p v-if="group.tab !== 'empleos' && s.price != null" class="text-sm font-bold" :class="isDark ? 'text-gray-100' : 'text-gray-900'">
              ${{ formatPrice(s.price) }}<span v-if="s.priceUnit" class="text-[10px] font-normal text-gray-400">/{{ s.priceUnit }}</span>
            </p>
            <p v-if="group.tab !== 'empleos' && s.price != null && convertLabel(s.price)" class="text-[10px] font-normal" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
              {{ convertLabel(s.price) }}<span v-if="s.priceUnit">/{{ s.priceUnit }}</span>
            </p>
            <p v-else-if="group.tab === 'empleos' && (s.salaryMin || s.salaryMax)" class="text-xs font-bold" :class="isDark ? 'text-emerald-400' : 'text-emerald-600'">
              <template v-if="s.salaryMin && s.salaryMax">${{ formatPrice(s.salaryMin) }}-{{ formatPrice(s.salaryMax) }}</template>
              <template v-else>${{ formatPrice(s.salaryMin || s.salaryMax) }}</template>
              <span v-if="s.salaryCurrency" class="text-[10px] font-normal text-gray-400 block">{{ s.salaryCurrency }}</span>
            </p>
          </div>
        </button>
        <button
          class="w-full flex items-center justify-between px-4 py-2 text-left text-xs font-semibold transition-colors"
          :class="isDark ? 'text-red-400 hover:bg-white/5' : 'text-workplace-red hover:bg-gray-50'"
          @click="$emit('see-all', group.tab)"
        >
          <span>Ver todos en {{ TAB_LABELS[group.tab] }}</span>
          <span class="flex items-center gap-0.5">
            {{ countFor(group.tab) }}
            <ChevronRightIcon class="h-3.5 w-3.5" />
          </span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import {
  ShoppingBagIcon, WrenchScrewdriverIcon, BriefcaseIcon, MagnifyingGlassIcon,
  ChevronRightIcon, ClockIcon, XMarkIcon, MapPinIcon, ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import { StarIcon } from '@heroicons/vue/24/solid'
import { useAssetUrl } from '~/composables/useAssetUrl'
import { useDefaultRate } from '~/composables/useDefaultRate'

const props = defineProps({
  query: { type: String, default: '' },
  suggestions: { type: Array, default: () => [] },
  counts: { type: Array, default: () => [] },
  recentTerms: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  staticPosition: { type: Boolean, default: false },
  highlightedIndex: { type: Number, default: -1 },
})
defineEmits(['select', 'see-all', 'hover', 'recent-select', 'recent-remove'])

const { isDark } = useColorMode()
const { getAssetUrl } = useAssetUrl()
const { convertLabel, load: loadDefaultRate } = useDefaultRate()
loadDefaultRate()

const TAB_LABELS = { productos: 'Productos', servicios: 'Servicios', empleos: 'Empleos' }
const TAB_ICONS = { productos: ShoppingBagIcon, servicios: WrenchScrewdriverIcon, empleos: BriefcaseIcon }

const groupedSuggestions = computed(() => {
  const order = ['productos', 'servicios', 'empleos']
  return order
    .map(tab => ({ tab, items: props.suggestions.filter(s => s.tab === tab) }))
    .filter(group => group.items.length > 0)
})

function countFor(tab) {
  return props.counts.find(c => c.tab === tab)?.total ?? 0
}

function flatIndex(suggestion) {
  return props.suggestions.indexOf(suggestion)
}

function isItemHighlighted(suggestion) {
  return props.highlightedIndex >= 0 && flatIndex(suggestion) === props.highlightedIndex
}

function resolveImage(image) {
  return getAssetUrl(image)
}

function formatPrice(value) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(value)
}
</script>
