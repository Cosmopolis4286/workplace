<template>
  <header class="bg-gradient-to-r from-white via-white to-red-50 shadow-xl border-b border-gray-200 backdrop-blur-lg sticky top-0 z-40">
    <div class="px-4 sm:px-6 lg:px-8 relative">
      <div class="flex justify-between h-16">
        <div class="flex items-center">
          <!-- Menu toggle button (mobile & desktop) -->
          <button
            @click="$emit('toggle-sidebar')"
            :class="[
              '-ml-2 mr-2 p-3 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95 group',
              sidebarOpen ? 'text-ifood-red bg-red-50' : 'text-gray-400 hover:text-ifood-red hover:bg-red-50'
            ]"
            aria-label="Toggle sidebar"
          >
            <Transition
              mode="out-in"
              enter-active-class="transition duration-200"
              enter-from-class="opacity-0 rotate-90"
              enter-to-class="opacity-100 rotate-0"
              leave-active-class="transition duration-200"
              leave-from-class="opacity-100 rotate-0"
              leave-to-class="opacity-0 -rotate-90"
            >
              <XMarkIcon v-if="sidebarOpen" key="close" class="h-6 w-6" />
              <Bars3Icon v-else key="menu" class="h-6 w-6" />
            </Transition>
          </button>
          
          <!-- Logo -->
          <div class="flex items-center group">
            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-r from-ifood-red to-red-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              <img class="relative h-10 w-10 rounded-xl shadow-lg transform group-hover:scale-110 transition-transform duration-300" src="https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop" alt="Logo">
            </div>
            <div class="ml-3">
              <span class="text-2xl font-black bg-gradient-to-r from-ifood-red to-red-600 bg-clip-text text-transparent">iFood</span>
              <span class="text-xl font-bold text-gray-700 ml-1">Manager</span>
            </div>
          </div>
        </div>

        <!-- Right side -->
        <div class="flex items-center space-x-4">
          <!-- Search -->
          <div class="hidden md:block relative group">
            <input 
              type="text" 
              placeholder="Buscar..." 
              class="w-64 pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md"
            >
            <div class="absolute left-4 top-1/2 transform -translate-y-1/2">
              <MagnifyingGlassIcon class="h-5 w-5 text-gray-400 group-focus-within:text-ifood-red transition-colors duration-300" />
            </div>
          </div>

          <!-- Notifications -->
          <NotificationPanel />

          <!-- Profile dropdown -->
          <div class="relative group" ref="profileDropdown">
            <button
              @click="showProfileMenu = !showProfileMenu"
              class="flex items-center p-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 hover:bg-red-50 transition-all duration-300 transform hover:scale-105"
            >
              <div class="relative">
                <img class="h-10 w-10 rounded-xl shadow-lg ring-2 ring-white transform group-hover:scale-110 transition-transform duration-300" src="https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop" alt="Avatar">
                <div class="absolute -bottom-1 -right-1 h-4 w-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              <ChevronDownIcon class="ml-2 h-4 w-4 text-gray-500 group-hover:text-ifood-red transition-colors duration-300 transform group-hover:rotate-180" />
            </button>
            
            <!-- Profile Dropdown Menu -->
            <Transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="transform opacity-0 scale-95"
              enter-to-class="transform opacity-100 scale-100"
              leave-active-class="transition ease-in duration-150"
              leave-from-class="transform opacity-100 scale-100"
              leave-to-class="transform opacity-0 scale-95"
            >
              <div v-if="showProfileMenu" class="absolute right-0 mt-3 w-56 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl py-2 z-50 border border-gray-200">
                <div class="px-4 py-3 border-b border-gray-100">
                  <p class="text-sm font-semibold text-gray-900">Juan Pérez</p>
                  <p class="text-xs text-gray-500">juan@restaurant.com</p>
                </div>
                <NuxtLink to="/perfil" class="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-ifood-red/10 hover:to-red-50 hover:text-ifood-red transition-all duration-200 transform hover:translate-x-1">
                  <UserIcon class="h-4 w-4 mr-3" />
                  Mi Perfil
                </NuxtLink>
                <NuxtLink to="/configuracion" class="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-ifood-red/10 hover:to-red-50 hover:text-ifood-red transition-all duration-200 transform hover:translate-x-1">
                  <CogIcon class="h-4 w-4 mr-3" />
                  Configuración
                </NuxtLink>
                <div class="border-t border-gray-100 mt-1 pt-1">
                  <button @click="handleLogout" class="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 transform hover:translate-x-1">
                    <ArrowRightOnRectangleIcon class="h-4 w-4 mr-3" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </Transition>
            </div>
          </div>
        </div>
      </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Bars3Icon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  UserIcon,
  CogIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'

defineProps({
  sidebarOpen: Boolean
})

defineEmits(['toggle-sidebar'])

const showProfileMenu = ref(false)
const profileDropdown = ref(null)
const { logout } = useAuth()

const handleClickOutside = (event) => {
  if (profileDropdown.value && !profileDropdown.value.contains(event.target)) {
    showProfileMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleLogout = async () => {
  try {
    await logout()
    await navigateTo('/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}
</script>