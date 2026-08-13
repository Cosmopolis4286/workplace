<template>
  <div v-if="items.length > 0" class="mb-4">
    <p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Vistos recientemente</p>
    <div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      <button
        v-for="item in items"
        :key="`${item.type}-${item.id}`"
        class="flex-shrink-0 flex items-center gap-2 bg-white border border-gray-100 rounded-xl shadow-sm pl-1.5 pr-3 py-1.5 hover:shadow-md transition-all"
        :class="accentHoverBorderClass"
        @click="$emit('open', item)"
      >
        <div class="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center" :class="accentBgClass">
          <img v-if="item.image" :src="imageSrc(item.image)" :alt="item.name" class="w-full h-full object-cover" />
          <svg v-else class="w-4 h-4" :class="accentIconClass" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="text-left">
          <p class="text-xs font-bold text-gray-800 line-clamp-1 max-w-[120px]">{{ item.name }}</p>
          <p v-if="item.price" class="text-[11px] font-semibold line-clamp-1 max-w-[120px]" :class="accentPriceClass">${{ formatPrice(item.price) }}</p>
          <p v-else-if="item.subtitle" class="text-[11px] text-gray-400 line-clamp-1 max-w-[120px]">{{ item.subtitle }}</p>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import type { RecentlyViewedItem } from '~/composables/search/useRecentlyViewed'

type Accent = 'red' | 'blue' | 'emerald'

const props = withDefaults(defineProps<{
  items: RecentlyViewedItem[]
  accent?: Accent
}>(), {
  accent: 'red',
})

defineEmits<{
  open: [item: RecentlyViewedItem]
}>()

const { getAssetUrl } = useAssetUrl()
function imageSrc(image: string) {
  return getAssetUrl(image) ?? ''
}
function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

const accentHoverBorderClass = computed<string>(() => ({
  red: 'hover:border-red-200',
  blue: 'hover:border-blue-200',
  emerald: 'hover:border-emerald-200',
} satisfies Record<Accent, string>)[props.accent])

const accentBgClass = computed<string>(() => ({
  red: 'bg-red-50',
  blue: 'bg-blue-50',
  emerald: 'bg-emerald-50',
} satisfies Record<Accent, string>)[props.accent])

const accentIconClass = computed<string>(() => ({
  red: 'text-red-200',
  blue: 'text-blue-200',
  emerald: 'text-emerald-200',
} satisfies Record<Accent, string>)[props.accent])

const accentPriceClass = computed<string>(() => ({
  red: 'text-red-600',
  blue: 'text-blue-600',
  emerald: 'text-emerald-600',
} satisfies Record<Accent, string>)[props.accent])
</script>
