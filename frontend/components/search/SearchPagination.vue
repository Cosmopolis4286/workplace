<template>
  <div v-if="totalPages > 1" class="flex items-center justify-center gap-1.5 mt-8">
    <button
      class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      :class="accentHoverClass"
      :disabled="currentPage <= 1" @click="$emit('change-page', currentPage - 1)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
    </button>
    <template v-for="page in visiblePages" :key="String(page)">
      <span v-if="page === '...'" class="w-9 h-9 flex items-center justify-center text-xs text-gray-400">…</span>
      <button v-else class="w-9 h-9 flex items-center justify-center rounded-xl text-sm font-bold transition-all"
        :class="page === currentPage ? accentActiveClass : `border border-gray-200 bg-white text-gray-600 ${accentHoverClass}`"
        @click="$emit('change-page', page as number)">{{ page }}</button>
    </template>
    <button
      class="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
      :class="accentHoverClass"
      :disabled="currentPage >= totalPages" @click="$emit('change-page', currentPage + 1)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Accent = 'red' | 'blue' | 'emerald'
type PageEntry = number | '...'

const props = withDefaults(defineProps<{
  currentPage: number
  totalPages: number
  accent?: Accent
}>(), {
  accent: 'red',
})

defineEmits<{
  'change-page': [page: number]
}>()

const visiblePages = computed<PageEntry[]>(() => {
  const cur = props.currentPage
  const max = props.totalPages
  if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1)
  const pages: PageEntry[] = [1]
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(max - 1, cur + 1); i++) pages.push(i)
  if (cur < max - 2) pages.push('...')
  pages.push(max)
  return pages
})

const accentHoverClass = computed<string>(() => ({
  red: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
  blue: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
  emerald: 'hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200',
} satisfies Record<Accent, string>)[props.accent])

const accentActiveClass = computed<string>(() => ({
  red: 'bg-red-600 text-white shadow-sm',
  blue: 'bg-blue-600 text-white shadow-sm',
  emerald: 'bg-emerald-600 text-white shadow-sm',
} satisfies Record<Accent, string>)[props.accent])
</script>
