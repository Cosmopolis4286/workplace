<template>
  <div class="p-8 text-center">
    <!-- Animación celebración -->
    <div class="relative inline-flex mb-6">
      <div class="absolute inset-0 bg-green-400/20 rounded-full animate-ping" />
      <div class="relative w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
        <CheckIcon class="w-10 h-10 text-green-600" />
      </div>
    </div>

    <!-- Resumen -->
    <div v-if="categoryObj || planObj" class="mb-6 bg-gray-50 rounded-2xl p-4 text-left space-y-2.5 text-sm">
      <div v-if="categoryObj" class="flex items-center justify-between">
        <span class="text-gray-500">Sector</span>
        <span class="font-semibold text-gray-900 flex items-center gap-1.5">
          <span>{{ categoryObj.icon || '🏢' }}</span>
          {{ categoryObj.name }}
        </span>
      </div>
      <div v-if="planObj" class="flex items-center justify-between">
        <span class="text-gray-500">Plan</span>
        <span class="font-semibold text-gray-900 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :style="{ background: planObj.color || '#ef4444' }" />
          {{ planObj.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/outline'

defineProps<{
  categoryObj: { id: string; name: string; icon?: string } | null
  planObj: { id: string; name: string; color: string } | null
}>()
</script>
