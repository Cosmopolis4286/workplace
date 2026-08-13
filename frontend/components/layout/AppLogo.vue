<template>
  <div class="flex items-center gap-2.5">
    <div
      class="flex items-center justify-center rounded-lg bg-workplace-red shadow-sm"
      :class="sizeClasses.box"
    >
      <svg
        :class="sizeClasses.icon"
        class="text-white"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08A7.2 7.2 0 0112 19.2z" />
      </svg>
    </div>
    <span :class="sizeClasses.text" class="font-black text-gray-900 tracking-tight">
      WorkPlace <span class="font-medium text-gray-500">Manager</span>
    </span>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: 'sm' | 'md' }>(), { size: 'md' })

const sizeClasses = computed(() => ({
  md: { box: 'w-8 h-8', icon: 'w-5 h-5', text: 'text-lg' },
  sm: { box: 'w-7 h-7', icon: 'w-4 h-4', text: 'text-base' },
}[props.size]))
</script>
