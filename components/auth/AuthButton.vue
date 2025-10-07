<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    @click="$emit('click')"
    class="group relative w-full flex justify-center items-center space-x-3 py-4 px-6 border border-transparent text-base font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 transform"
    :class="buttonClasses"
  >
    <!-- Loading Spinner -->
    <div v-if="loading" class="absolute left-4">
      <div class="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent"></div>
    </div>
    
    <!-- Icon -->
    <component 
      v-if="icon && !loading" 
      :is="icon" 
      class="h-5 w-5 transition-transform duration-200 group-hover:scale-110"
    />
    
    <!-- Text -->
    <span :class="{ 'ml-6': loading }">{{ text }}</span>
    
    <!-- Glow Effect for Primary Buttons -->
    <div 
      v-if="variant === 'primary'" 
      class="absolute inset-0 rounded-xl bg-gradient-to-r from-ifood-red to-red-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl"
    ></div>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  type: {
    type: String,
    default: 'button'
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'outline'].includes(value)
  },
  text: {
    type: String,
    required: true
  },
  icon: Object,
  loading: Boolean,
  disabled: Boolean
})

defineEmits(['click'])

const buttonClasses = computed(() => {
  const base = 'relative overflow-hidden'
  
  if (props.disabled || props.loading) {
    return `${base} opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-300`
  }
  
  switch (props.variant) {
    case 'primary':
      return `${base} bg-gradient-to-r from-ifood-red to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl hover:scale-105 focus:ring-ifood-red`
    
    case 'secondary':
      return `${base} bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 border-gray-300 hover:border-gray-400 shadow-md hover:shadow-lg hover:scale-105 focus:ring-gray-500`
    
    case 'outline':
      return `${base} bg-white/70 backdrop-blur-sm hover:bg-white border-gray-300 hover:border-ifood-red text-gray-700 hover:text-ifood-red shadow-md hover:shadow-lg hover:scale-105 focus:ring-ifood-red`
    
    default:
      return base
  }
})
</script>