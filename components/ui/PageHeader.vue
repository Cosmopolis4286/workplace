<template>
  <div class="relative overflow-hidden bg-gradient-to-br from-white via-gray-50 to-red-50 rounded-3xl mb-8 shadow-xl border border-gray-200/50">
    <!-- Background Pattern -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-ifood-red/10 to-red-600/10 rounded-full blur-2xl"></div>
      <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-ifood-orange/10 to-orange-600/10 rounded-full blur-xl"></div>
    </div>

    <div class="relative px-6 sm:px-8 py-8 sm:py-12">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <!-- Left Content -->
        <div class="flex items-center space-x-4">
          <!-- Icon -->
          <div v-if="icon" class="p-4 bg-gradient-to-br from-ifood-red to-red-600 rounded-2xl shadow-lg transform hover:scale-110 transition-all duration-300 floating-animation">
            <component :is="icon" class="h-8 w-8 text-white" />
          </div>
          
          <!-- Text Content -->
          <div>
            <h1 class="text-3xl sm:text-4xl font-black text-gray-900 mb-2 gradient-text">
              {{ title }}
            </h1>
            <p class="text-lg text-gray-600 font-medium max-w-2xl">
              {{ description }}
            </p>
            
            <!-- Breadcrumb -->
            <nav v-if="breadcrumb && breadcrumb.length > 0" class="flex items-center space-x-2 mt-3">
              <template v-for="(item, index) in breadcrumb" :key="index">
                <NuxtLink 
                  v-if="item.to" 
                  :to="item.to"
                  class="text-sm text-gray-500 hover:text-ifood-red transition-colors duration-200 font-medium"
                >
                  {{ item.label }}
                </NuxtLink>
                <span v-else class="text-sm text-gray-400 font-medium">{{ item.label }}</span>
                <ChevronRightIcon v-if="index < breadcrumb.length - 1" class="h-4 w-4 text-gray-400" />
              </template>
            </nav>
          </div>
        </div>

        <!-- Right Actions -->
        <div v-if="$slots.actions" class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <slot name="actions" />
        </div>
      </div>

      <!-- Stats Bar -->
      <div v-if="stats && stats.length > 0" class="mt-8 pt-6 border-t border-gray-200/50">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div v-for="stat in stats" :key="stat.label" class="text-center group">
            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-r from-ifood-red/20 to-red-600/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div class="relative bg-white/80 backdrop-blur-sm rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 transform group-hover:scale-105">
                <div class="text-2xl sm:text-3xl font-black text-gray-900 mb-1">{{ stat.value }}</div>
                <div class="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider">{{ stat.label }}</div>
                <div v-if="stat.change" class="flex items-center justify-center mt-2">
                  <component 
                    :is="stat.changeType === 'increase' ? ArrowUpIcon : ArrowDownIcon" 
                    :class="['h-3 w-3 mr-1', stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600']"
                  />
                  <span :class="['text-xs font-bold', stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600']">
                    {{ stat.change }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ChevronRightIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/vue/24/outline'

defineProps({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: Object,
    default: null
  },
  breadcrumb: {
    type: Array,
    default: () => []
  },
  stats: {
    type: Array,
    default: () => []
  }
})
</script>

<style scoped>
.gradient-text {
  background: linear-gradient(135deg, #ea1d2c 0%, #dc2626 50%, #b91c1c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.floating-animation {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(1deg); }
  50% { transform: translateY(-6px) rotate(0deg); }
  75% { transform: translateY(-3px) rotate(-1deg); }
}
</style>