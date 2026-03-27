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
        class="relative flex-1 flex flex-col h-full max-w-xs w-full bg-gradient-to-b from-white via-white to-gray-50 shadow-2xl border-r-4 border-workplace-red/20"
      >
        <!-- Mobile Header -->
        <div class="px-6 py-4 bg-gradient-to-r from-workplace-red to-red-600 text-white flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span class="text-white font-bold text-lg">iF</span>
            </div>
            <div>
              <h1 class="text-xl font-bold">WorkPlace Manager</h1>
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
      <div class="flex flex-col h-full bg-gradient-to-b from-white via-white to-gray-50 border-r-2 border-gray-200 shadow-2xl">
        <!-- Header fijo, fuera del scroll -->
        <div class="h-16 flex-shrink-0 px-6 border-b border-white/20 bg-gradient-to-r from-workplace-red to-red-700 flex items-center gap-3 shadow-md">
          <div class="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0 ring-1 ring-white/30">
            <span class="text-white font-black text-base">iF</span>
          </div>
          <div class="min-w-0">
            <h1 class="text-base font-bold text-white leading-tight tracking-tight">WorkPlace Manager</h1>
            <p class="text-xs text-red-100/80 leading-tight">Panel de Control</p>
          </div>
        </div>
        <!-- Contenido (maneja su propio scroll internamente) -->
        <div class="flex-1 min-h-0">
          <SidebarContent />
        </div>
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