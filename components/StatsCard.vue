<template>
  <div class="card-premium p-6 group hover:glow-effect">
    <div class="flex items-center justify-between">
      <div class="flex-shrink-0">
        <div :class="['p-4 rounded-2xl shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300', iconBgClass]">
          <component :is="icon" :class="['h-8 w-8 text-white', iconColorClass]" />
        </div>
      </div>
      <div class="text-right">
        <div class="text-3xl font-black text-gray-900 group-hover:scale-105 transition-transform duration-300">{{ formatValue }}</div>
        <div class="text-xs text-gray-500 font-semibold uppercase tracking-wider">{{ title }}</div>
      </div>
    </div>
    
    <div class="mt-4 pt-4 border-t border-gray-100">
      <div class="flex items-center justify-between">
        <div class="flex items-center text-sm">
          <component 
            :is="changeType === 'increase' ? ArrowUpIcon : ArrowDownIcon" 
            :class="['h-4 w-4 mr-2 transform group-hover:scale-110 transition-transform duration-300', changeType === 'increase' ? 'text-green-600' : 'text-red-600']"
          />
          <span :class="['font-bold', changeType === 'increase' ? 'text-green-600' : 'text-red-600']">
            {{ change }}
          </span>
        </div>
        <span class="text-xs text-gray-400 font-medium">{{ period }}</span>
      </div>
      
      <!-- Progress bar -->
      <div class="mt-3 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          :class="['h-2 rounded-full transition-all duration-1000 ease-out', progressBarColor]"
          :style="{ width: `${progressPercentage}%` }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'

const props = defineProps({
  title: String,
  value: String,
  icon: Object,
  change: String,
  changeType: String,
  period: {
    type: String,
    default: 'desde ayer'
  },
  variant: {
    type: String,
    default: 'primary'
  },
  format: {
    type: String,
    default: 'number'
  },
  progress: {
    type: Number,
    default: 75
  }
})

const formatValue = computed(() => {
  if (props.format === 'currency') {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(parseFloat(props.value.replace(/[^0-9.-]+/g, '')))
  }
  return props.value
})

const progressPercentage = computed(() => {
  return Math.min(Math.max(props.progress, 0), 100)
})

const iconBgClass = computed(() => {
  const variants = {
    primary: 'bg-gradient-to-br from-red-500 to-red-600',
    secondary: 'bg-gradient-to-br from-orange-500 to-orange-600',
    success: 'bg-gradient-to-br from-green-500 to-green-600',
    warning: 'bg-gradient-to-br from-yellow-500 to-yellow-600'
  }
  return variants[props.variant] || variants.primary
})

const iconColorClass = computed(() => {
  const variants = {
    primary: 'text-white',
    secondary: 'text-white',
    success: 'text-white',
    warning: 'text-white'
  }
  return variants[props.variant] || variants.primary
})

const progressBarColor = computed(() => {
  const variants = {
    primary: 'bg-gradient-to-r from-red-400 to-red-500',
    secondary: 'bg-gradient-to-r from-orange-400 to-orange-500',
    success: 'bg-gradient-to-r from-green-400 to-green-500',
    warning: 'bg-gradient-to-r from-yellow-400 to-yellow-500'
  }
  return variants[props.variant] || variants.primary
})
</script>