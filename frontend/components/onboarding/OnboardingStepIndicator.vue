<template>
  <div class="flex items-center gap-2 mb-6 justify-center">
    <template v-for="(label, i) in steps" :key="i">
      <div class="flex items-center gap-2">
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0"
          :class="i < currentStep
            ? 'bg-red-600 text-white shadow-sm shadow-red-200'
            : i === currentStep
              ? 'bg-red-600 text-white ring-4 ring-red-600/20'
              : 'bg-gray-100 text-gray-400'"
        >
          <CheckIcon v-if="i < currentStep" class="w-4 h-4" />
          <span v-else>{{ i + 1 }}</span>
        </div>
        <span
          class="text-xs font-semibold hidden sm:block transition-colors duration-300"
          :class="i <= currentStep ? 'text-gray-800' : 'text-gray-400'"
        >{{ label }}</span>
      </div>
      <div
        v-if="i < steps.length - 1"
        class="flex-1 h-0.5 max-w-14 rounded-full transition-colors duration-500"
        :class="i < currentStep ? 'bg-red-600' : 'bg-gray-200'"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon } from '@heroicons/vue/24/outline'

defineProps<{
  steps: string[]
  currentStep: number
}>()
</script>
