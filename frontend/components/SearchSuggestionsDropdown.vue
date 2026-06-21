<template>
  <div
    :class="[
      staticPosition ? 'mt-2' : 'absolute left-0 right-0 mt-2 rounded-2xl shadow-2xl border z-50 max-h-96 overflow-y-auto',
      !staticPosition && (isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'),
    ]"
  >
    <!-- Vacío -->
    <div v-if="!query || query.trim().length < 2" class="px-4 py-6 text-center text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
      Escribe al menos 2 letras para buscar…
    </div>

    <!-- Loading -->
    <div v-else-if="loading && suggestions.length === 0" class="px-4 py-3 space-y-2">
      <div v-for="i in 3" :key="i" class="h-10 rounded-xl animate-pulse" :class="isDark ? 'bg-gray-700' : 'bg-gray-100'" />
    </div>

    <!-- Sin resultados -->
    <div v-else-if="!loading && suggestions.length === 0" class="px-4 py-6 text-center text-sm" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
      Sin resultados para "{{ query }}"
    </div>

    <!-- Resultados agrupados por tab -->
    <template v-else>
      <div v-for="group in groupedSuggestions" :key="group.tab" class="py-1.5">
        <p class="px-4 pt-1 pb-1 text-[11px] font-semibold uppercase tracking-wide" :class="isDark ? 'text-gray-500' : 'text-gray-400'">
          {{ TAB_LABELS[group.tab] }}
        </p>
        <button
          v-for="s in group.items"
          :key="s.id"
          class="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
          :class="isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'"
          @click="$emit('select', s)"
        >
          <div class="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" :class="isDark ? 'bg-gray-700' : 'bg-gray-100'">
            <img v-if="s.image" :src="resolveImage(s.image)" alt="" class="h-full w-full object-cover">
            <component :is="TAB_ICONS[group.tab]" v-else class="h-4 w-4" :class="isDark ? 'text-gray-500' : 'text-gray-400'" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate" :class="isDark ? 'text-gray-100' : 'text-gray-800'">{{ s.title }}</p>
            <p v-if="s.subtitle" class="text-xs truncate" :class="isDark ? 'text-gray-500' : 'text-gray-400'">{{ s.subtitle }}</p>
          </div>
        </button>
        <button
          class="w-full px-4 py-1.5 text-left text-xs font-medium text-workplace-red hover:underline"
          @click="$emit('see-all', group.tab)"
        >
          Ver todos los resultados en {{ TAB_LABELS[group.tab] }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ShoppingBagIcon, WrenchScrewdriverIcon, BriefcaseIcon } from '@heroicons/vue/24/outline'
import { useAssetUrl } from '~/composables/useAssetUrl'

const props = defineProps({
  query: { type: String, default: '' },
  suggestions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  staticPosition: { type: Boolean, default: false },
})
defineEmits(['select', 'see-all'])

const { isDark } = useColorMode()
const { getAssetUrl } = useAssetUrl()

const TAB_LABELS = { productos: 'Productos', servicios: 'Servicios', empleos: 'Empleos' }
const TAB_ICONS = { productos: ShoppingBagIcon, servicios: WrenchScrewdriverIcon, empleos: BriefcaseIcon }

const groupedSuggestions = computed(() => {
  const order = ['productos', 'servicios', 'empleos']
  return order
    .map(tab => ({ tab, items: props.suggestions.filter(s => s.tab === tab) }))
    .filter(group => group.items.length > 0)
})

function resolveImage(image) {
  return getAssetUrl(image)
}
</script>
