<template>
  <component
    :is="to ? NuxtLink : 'button'"
    :to="to"
    :disabled="!to && (disabled || loading)"
    :title="title"
    :class="[
      'inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
      variant === 'primary' ? 'btn-primary' : 'btn-secondary',
    ]"
    v-bind="$attrs"
  >
    <component :is="icon" v-if="icon" class="h-4 w-4 shrink-0" :class="{ 'animate-spin': loading }" />
    <slot />
  </component>
</template>

<script setup lang="ts">
import { resolveComponent } from 'vue'

defineProps<{
  icon?: object | Function
  variant?: 'primary' | 'secondary'
  to?: string
  disabled?: boolean
  loading?: boolean
  title?: string
}>()

const NuxtLink = resolveComponent('NuxtLink')
</script>
