<template>
  <div class="flex items-center gap-3 mb-6">
    <div class="w-10 h-10 rounded-xl flex items-center justify-center" :class="iconClass">
      <span :class="iconColor"><slot name="icon" /></span>
    </div>
    <div>
      <h3 class="text-base font-bold text-gray-900">{{ title }}</h3>
      <p class="text-xs text-gray-500">{{ subtitle }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  iconClass?: string
  iconColor?: string
  title?: string
  subtitle?: string
}>()
</script>
