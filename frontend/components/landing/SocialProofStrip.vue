<template>
  <div class="border-y border-gray-100 bg-gray-50 py-5">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-center gap-x-12 gap-y-4 items-center">
      <!-- Skeleton while loading -->
      <template v-if="loading">
        <div v-for="n in 5" :key="n" class="text-center space-y-1.5">
          <div class="h-7 w-16 bg-gray-200 rounded-md animate-pulse mx-auto"></div>
          <div class="h-3 w-20 bg-gray-100 rounded animate-pulse mx-auto"></div>
        </div>
      </template>
      <template v-else>
        <div v-for="stat in stats" :key="stat.label" class="text-center">
          <p class="text-2xl font-black text-gray-900">{{ stat.value }}</p>
          <p class="text-xs text-gray-500 font-medium mt-0.5">{{ stat.label }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PublicStat } from '~/composables/admin/useLandingContent'

defineProps<{
  loading: boolean
  stats: PublicStat[]
}>()
</script>
