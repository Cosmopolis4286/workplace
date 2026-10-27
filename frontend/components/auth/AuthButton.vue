<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    @click="!disabled && !loading && $emit('click')"
    class="relative w-full flex justify-center items-center gap-2 py-3 px-5 rounded-xl text-sm font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed select-none"
    :class="buttonClasses"
  >
    <!-- Spinner -->
    <span v-if="loading" class="absolute left-4 flex items-center">
      <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </span>

    <!-- Icon -->
    <component
      v-if="icon && !loading"
      :is="icon"
      class="h-4 w-4 flex-shrink-0"
    />

    <!-- Label -->
    <span :class="{ 'opacity-0': loading && !icon }">{{ text }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'

const props = defineProps({
  type: { type: String as PropType<'button' | 'submit' | 'reset'>, default: 'button' },
  variant: {
    type: String,
    default: 'primary',
    validator: (v: string) => ['primary', 'secondary', 'outline', 'ghost', 'danger'].includes(v)
  },
  text: { type: String, required: true },
  icon: [Object, Function],
  loading: Boolean,
  disabled: Boolean
})

defineEmits(['click'])

const buttonClasses = computed(() => {
  if (props.disabled || props.loading) {
    return 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200 focus:ring-gray-200'
  }
  switch (props.variant) {
    case 'primary':
      return 'bg-workplace-red hover:bg-red-700 active:bg-red-800 text-white border-transparent shadow-sm hover:shadow-md focus:ring-workplace-red/40'
    case 'secondary':
      return 'bg-gray-900 hover:bg-gray-800 active:bg-gray-950 text-white border-transparent shadow-sm hover:shadow-md focus:ring-gray-500/40'
    case 'outline':
      return 'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300 shadow-sm focus:ring-gray-200'
    case 'ghost':
      return 'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-600 border-transparent focus:ring-gray-200'
    case 'danger':
      return 'bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-600 border-red-200 hover:border-red-300 shadow-sm focus:ring-red-300'
    default:
      return ''
  }
})
</script>
