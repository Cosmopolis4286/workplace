<template>
  <header class="bg-gradient-to-r from-white via-white to-red-50 shadow-lg border-b border-gray-200 sticky top-0 z-40">
    <div class="px-3 relative">
      <div class="flex justify-between h-14 items-center">

        <!-- Left: Menu + Logo -->
        <div class="flex items-center gap-2">
          <!-- Menu toggle optimizado para touch -->
          <button
            @click="$emit('toggle-sidebar')"
            :class="[
              'p-2.5 rounded-xl transition-all duration-200 touch-manipulation',
              'min-h-[44px] min-w-[44px]', // Mínimo para touch
              sidebarOpen 
                ? 'text-workplace-red bg-red-50 shadow-sm' 
                : 'text-gray-500 hover:text-workplace-red hover:bg-red-50 active:scale-95'
            ]"
            aria-label="Toggle sidebar"
          >
            <Transition
              mode="out-in"
              enter-active-class="transition duration-150"
              enter-from-class="opacity-0 rotate-90"
              enter-to-class="opacity-100 rotate-0"
              leave-active-class="transition duration-150"
              leave-from-class="opacity-100 rotate-0"
              leave-to-class="opacity-0 -rotate-90"
            >
              <XMarkIcon v-if="sidebarOpen" key="close" class="h-5 w-5" />
              <Bars3Icon v-else key="menu" class="h-5 w-5" />
            </Transition>
          </button>

          <!-- Logo compacto para mobile -->
          <NuxtLink to="/dashboard" class="flex items-center group active:scale-95 transition-transform">
            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-r from-workplace-red to-red-600 rounded-lg blur opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div class="relative h-8 w-8 rounded-lg bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center shadow-md">
                <span class="text-white font-black text-sm">W</span>
              </div>
            </div>
            <div class="ml-2">
              <span class="text-lg font-black bg-gradient-to-r from-workplace-red to-red-600 bg-clip-text text-transparent">WP</span>
            </div>
          </NuxtLink>
        </div>

        <!-- Center: Page title -->
        <div class="flex-1 mx-3">
          <div class="flex items-center justify-center gap-1.5">
            <component :is="currentPageIcon" class="h-4 w-4 text-gray-400" />
            <span class="text-sm font-semibold text-gray-700 truncate text-center">{{ currentPageTitle }}</span>
          </div>
        </div>

        <!-- Right: Notifications + Profile -->
        <div class="flex items-center gap-1">
          <!-- Notifications optimizadas -->
          <button
            @click="toggleNotifications"
            :class="[
              'p-2.5 rounded-xl transition-all duration-200 touch-manipulation',
              'min-h-[44px] min-w-[44px]',
              'text-gray-500 hover:text-workplace-red hover:bg-red-50 active:scale-95 relative'
            ]"
          >
            <BellIcon class="h-5 w-5" />
            <span 
              v-if="unreadCount > 0"
              class="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {{ unreadCount > 9 ? '9+' : unreadCount }}
            </span>
          </button>

          <!-- Profile compacto -->
          <button
            @click="showProfileMenu = !showProfileMenu"
            class="flex items-center p-1.5 rounded-xl hover:bg-red-50 active:scale-95 transition-all duration-200 touch-manipulation"
          >
            <div class="relative h-8 w-8 rounded-lg overflow-hidden shadow-sm ring-2 ring-white">
              <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover">
              <div v-else class="h-full w-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center">
                <span class="text-white font-bold text-xs">{{ userInitials }}</span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- Mobile page title bar -->
      <div v-if="showPageTitle" class="py-2 border-t border-gray-100">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-lg font-bold text-gray-800">{{ currentPageTitle }}</h1>
            <p v-if="currentPageSubtitle" class="text-xs text-gray-500">{{ currentPageSubtitle }}</p>
          </div>
          <!-- Action buttons for current page -->
          <div class="flex items-center gap-1">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </div>

    <!-- Profile dropdown mobile -->
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="transform opacity-0 scale-95 -translate-y-2"
      enter-to-class="transform opacity-100 scale-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="transform opacity-100 scale-100 translate-y-0"
      leave-to-class="transform opacity-0 scale-95 -translate-y-2"
    >
      <div
        v-if="showProfileMenu"
        class="absolute right-3 top-14 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50"
      >
        <!-- User info -->
        <div class="px-4 py-3 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="relative h-10 w-10 rounded-lg overflow-hidden shadow-sm">
              <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover">
              <div v-else class="h-full w-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center">
                <span class="text-white font-bold text-sm">{{ userInitials }}</span>
              </div>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-gray-800">{{ fullName }}</p>
              <p class="text-xs text-gray-500">{{ roleLabel }}</p>
            </div>
          </div>
        </div>

        <!-- Menu items -->
        <div class="py-1">
          <button
            v-for="item in profileMenuItems"
            :key="item.key"
            @click="handleProfileAction(item)"
            class="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 active:bg-gray-100 transition-colors flex items-center gap-3"
          >
            <component :is="item.icon" class="h-4 w-4 text-gray-400" />
            <span class="text-gray-700">{{ item.label }}</span>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Notifications panel mobile -->
    <Transition
      enter-active-class="transition ease-out duration-300"
      enter-from-class="transform opacity-0 translate-x-full"
      enter-to-class="transform opacity-100 translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="transform opacity-100 translate-x-0"
      leave-to-class="transform opacity-0 translate-x-full"
    >
      <div
        v-if="showNotifications"
        class="fixed right-0 top-14 bottom-0 w-80 bg-white shadow-2xl border-l border-gray-200 z-50 overflow-hidden"
      >
        <NotificationPanel @close="showNotifications = false" />
      </div>
    </Transition>
  </header>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { 
  Bars3Icon, 
  XMarkIcon, 
  BellIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BuildingStorefrontIcon
} from '@heroicons/vue/24/outline'

const props = defineProps({
  sidebarOpen: Boolean,
  user: Object,
  currentPage: Object
})

const emit = defineEmits(['toggle-sidebar', 'profile-action'])

const showProfileMenu = ref(false)
const showNotifications = ref(false)
const showPageTitle = ref(false)

// Computed properties
const currentPageTitle = computed(() => props.currentPage?.title || 'Dashboard')
const currentPageSubtitle = computed(() => props.currentPage?.subtitle || '')
const currentPageIcon = computed(() => props.currentPage?.icon || null)

const commerceName = computed(() => props.user?.commerceName || '')
const fullName = computed(() => props.user?.fullName || 'Usuario')
const userInitials = computed(() => {
  const name = fullName.value
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
})
const avatarUrl = computed(() => props.user?.avatarUrl || '')
const roleLabel = computed(() => props.user?.role || 'Admin')

const unreadCount = computed(() => 5) // Mock data

const profileMenuItems = computed(() => [
  { key: 'profile', label: 'Mi Perfil', icon: UserIcon },
  { key: 'settings', label: 'Configuración', icon: Cog6ToothIcon },
  { key: 'commerce', label: commerceName.value, icon: BuildingStorefrontIcon },
  { key: 'logout', label: 'Cerrar Sesión', icon: ArrowRightOnRectangleIcon }
])

// Methods
const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
  showProfileMenu.value = false
}

const handleProfileAction = (item) => {
  emit('profile-action', item.key)
  showProfileMenu.value = false
}

// Close dropdowns when clicking outside
const handleClickOutside = (event) => {
  if (!event.target.closest('.relative')) {
    showProfileMenu.value = false
    showNotifications.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.touch-manipulation {
  touch-action: manipulation;
}
</style>
