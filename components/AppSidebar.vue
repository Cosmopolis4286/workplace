<template>
  <!-- Mobile sidebar overlay -->
  <div v-if="open" class="fixed inset-0 z-50 lg:hidden">
    <Transition
      enter-active-class="transition-opacity ease-linear duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity ease-linear duration-300"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div 
        v-if="open"
        class="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/60 to-black/40 backdrop-blur-sm" 
        @click="$emit('update:open', false)"
      ></div>
    </Transition>
    
    <Transition
      enter-active-class="transition ease-in-out duration-300 transform"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transition ease-in-out duration-300 transform"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <div
        v-if="open"
        class="relative flex-1 flex flex-col max-w-xs w-full bg-gradient-to-b from-white via-white to-gray-50 shadow-2xl border-r-4 border-ifood-red/20"
      >
        <!-- Mobile Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-ifood-red to-red-600 text-white flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span class="text-white font-bold text-lg">iF</span>
            </div>
            <div>
              <h1 class="text-xl font-bold">iFood Manager</h1>
              <p class="text-xs text-red-100">Panel de Control</p>
            </div>
          </div>
          <!-- Close Button Inside Header -->
          <button
            @click="$emit('update:open', false)"
            class="flex items-center justify-center h-10 w-10 rounded-lg bg-white/20 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white hover:bg-white/30 transition-all duration-300 transform hover:scale-110 hover:rotate-90 flex-shrink-0"
          >
            <XMarkIcon class="h-6 w-6 text-white drop-shadow-lg" />
          </button>
        </div>
        
        <!-- Mobile Content -->
        <div class="flex-1 overflow-y-auto">
          <SidebarContent @navigate="$emit('update:open', false)" />
        </div>
      </div>
    </Transition>
  </div>

  <!-- Desktop sidebar -->
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="-translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="-translate-x-full opacity-0"
  >
    <div
      v-if="open"
      class="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 z-30"
    >
      <div class="flex flex-col flex-grow bg-gradient-to-b from-white via-white to-gray-50 border-r-2 border-gray-200 overflow-y-auto shadow-2xl">
        <div class="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-ifood-red to-red-600">
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <span class="text-white font-bold text-lg">iF</span>
              </div>
              <div>
                <h1 class="text-lg font-bold text-white">iFood Manager</h1>
                <p class="text-xs text-red-100">Panel de Control</p>
              </div>
            </div>
            <button
              @click="$emit('update:open', false)"
              class="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 transform hover:scale-110"
              aria-label="Close sidebar"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>
        </div>
        <SidebarContent />
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { XMarkIcon } from '@heroicons/vue/24/outline'

defineProps({
  open: Boolean
})

defineEmits(['update:open'])
</script>