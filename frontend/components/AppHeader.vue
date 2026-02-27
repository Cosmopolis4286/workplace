<template>
  <header class="bg-gradient-to-r from-white via-white to-red-50 shadow-xl border-b border-gray-200 backdrop-blur-lg sticky top-0 z-40">
    <div class="px-4 sm:px-6 lg:px-8 relative">
      <div class="flex justify-between h-16">

        <!-- Left: Toggle + Logo + Breadcrumb -->
        <div class="flex items-center gap-3">
          <!-- Menu toggle -->
          <button
            @click="$emit('toggle-sidebar')"
            :class="[
              '-ml-2 p-3 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95',
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
          <NuxtLink to="/dashboard" class="flex items-center group">
            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-r from-ifood-red to-red-600 rounded-xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div class="relative h-10 w-10 rounded-xl bg-gradient-to-br from-ifood-red to-red-700 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                <span class="text-white font-black text-lg">i</span>
              </div>
            </div>
            <div class="ml-3 hidden sm:block">
              <span class="text-2xl font-black bg-gradient-to-r from-ifood-red to-red-600 bg-clip-text text-transparent">iFood</span>
              <span class="text-xl font-bold text-gray-700 ml-1">Manager</span>
            </div>
          </NuxtLink>

          <!-- Divider + Page title -->
          <div class="hidden md:flex items-center gap-2 ml-2">
            <div class="h-6 w-px bg-gray-200"></div>
            <div class="flex items-center gap-1.5">
              <component :is="currentPageIcon" class="h-4 w-4 text-gray-400" />
              <span class="text-sm font-medium text-gray-600">{{ currentPageTitle }}</span>
            </div>
          </div>
        </div>

        <!-- Right side -->
        <div class="flex items-center gap-3">
          <!-- Restaurant name badge -->
          <div v-if="restaurantName" class="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg">
            <BuildingStorefrontIcon class="h-4 w-4 text-ifood-red" />
            <span class="text-sm font-medium text-ifood-red truncate max-w-32">{{ restaurantName }}</span>
          </div>

          <!-- Notifications -->
          <NotificationPanel />

          <!-- Profile dropdown -->
          <div class="relative" ref="profileDropdown">
            <button
              @click="showProfileMenu = !showProfileMenu"
              class="flex items-center gap-2 p-2 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 hover:bg-red-50 transition-all duration-300"
            >
              <!-- Avatar con iniciales -->
              <div class="relative h-9 w-9 rounded-xl bg-gradient-to-br from-ifood-red to-red-700 flex items-center justify-center shadow-md ring-2 ring-white">
                <span class="text-white font-bold text-sm">{{ userInitials }}</span>
              </div>
              <div class="hidden md:block text-left">
                <p class="text-sm font-semibold text-gray-800 leading-tight">{{ fullName }}</p>
                <p class="text-xs text-gray-500 leading-tight">{{ roleLabel }}</p>
              </div>
              <ChevronDownIcon
                class="h-4 w-4 text-gray-400 transition-transform duration-300"
                :class="showProfileMenu ? 'rotate-180 text-ifood-red' : ''"
              />
            </button>

            <!-- Dropdown -->
            <Transition
              enter-active-class="transition ease-out duration-200"
              enter-from-class="transform opacity-0 scale-95 -translate-y-1"
              enter-to-class="transform opacity-100 scale-100 translate-y-0"
              leave-active-class="transition ease-in duration-150"
              leave-from-class="transform opacity-100 scale-100 translate-y-0"
              leave-to-class="transform opacity-0 scale-95 -translate-y-1"
            >
              <div v-if="showProfileMenu" class="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl py-2 z-50 border border-gray-100">
                <!-- User info -->
                <div class="px-4 py-3 border-b border-gray-100">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-ifood-red to-red-700 flex items-center justify-center shadow-sm flex-shrink-0">
                      <span class="text-white font-bold text-sm">{{ userInitials }}</span>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold text-gray-900 truncate">{{ fullName }}</p>
                      <p class="text-xs text-gray-500 truncate">{{ userEmail }}</p>
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-50 text-ifood-red mt-0.5">
                        {{ roleLabel }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Links -->
                <NuxtLink
                  to="/perfil"
                  @click="showProfileMenu = false"
                  class="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-ifood-red transition-all duration-200 gap-3"
                >
                  <UserIcon class="h-4 w-4 flex-shrink-0" />
                  Mi Perfil
                </NuxtLink>
                <NuxtLink
                  to="/configuracion"
                  @click="showProfileMenu = false"
                  class="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-ifood-red transition-all duration-200 gap-3"
                >
                  <CogIcon class="h-4 w-4 flex-shrink-0" />
                  Configuración
                </NuxtLink>

                <div class="border-t border-gray-100 mt-1 pt-1">
                  <button
                    @click="handleLogout"
                    class="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 gap-3"
                  >
                    <ArrowRightOnRectangleIcon class="h-4 w-4 flex-shrink-0" />
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  UserIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  BuildingStorefrontIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  CalendarDaysIcon,
  TruckIcon,
  ChartBarIcon,
  BanknotesIcon,
  Squares2X2Icon,
  BellIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'

defineProps({
  sidebarOpen: Boolean,
})
defineEmits(['toggle-sidebar'])

const route = useRoute()
const { logout, user } = useAuth()

// ── User data ──────────────────────────────────────────────────────────────
const fullName = computed(() => {
  if (!user.value) return 'Usuario'
  return `${user.value.firstName} ${user.value.lastName}`.trim()
})

const userInitials = computed(() => {
  if (!user.value) return 'U'
  const f = user.value.firstName?.[0] ?? ''
  const l = user.value.lastName?.[0] ?? ''
  return (f + l).toUpperCase() || 'U'
})

const userEmail = computed(() => user.value?.email ?? '')

const restaurantName = computed(() => user.value?.restaurant?.name ?? '')

const ROLE_LABELS = { ADMIN: 'Administrador', MANAGER: 'Gerente', STAFF: 'Personal' }
const roleLabel = computed(() => ROLE_LABELS[user.value?.role] ?? user.value?.role ?? '')

// ── Page title / icon ──────────────────────────────────────────────────────
const PAGE_MAP = {
  '/dashboard':        { title: 'Dashboard',       icon: HomeIcon },
  '/menu':             { title: 'Menú',             icon: Squares2X2Icon },
  '/clientes':         { title: 'Clientes',         icon: UsersIcon },
  '/agendamientos':    { title: 'Agendamientos',    icon: CalendarDaysIcon },
  '/delivery':         { title: 'Delivery',         icon: TruckIcon },
  '/cliente-dashboard':{ title: 'Pedidos',          icon: ClipboardDocumentListIcon },
  '/gastos':           { title: 'Gastos',           icon: BanknotesIcon },
  '/analytics':        { title: 'Analíticas',       icon: ChartBarIcon },
  '/configuracion':    { title: 'Configuración',    icon: CogIcon },
  '/perfil':           { title: 'Mi Perfil',        icon: UserIcon },
  '/notificaciones':   { title: 'Notificaciones',   icon: BellIcon },
}

const currentPage = computed(() => {
  const path = route.path
  return PAGE_MAP[path] ?? null
})

const currentPageTitle = computed(() => currentPage.value?.title ?? '')
const currentPageIcon = computed(() => currentPage.value?.icon ?? null)

// ── Dropdown ──────────────────────────────────────────────────────────────
const showProfileMenu = ref(false)
const profileDropdown = ref(null)

const handleClickOutside = (event) => {
  if (profileDropdown.value && !profileDropdown.value.contains(event.target)) {
    showProfileMenu.value = false
  }
}

onMounted(() => document.addEventListener('click', handleClickOutside))
onUnmounted(() => document.removeEventListener('click', handleClickOutside))

// ── Logout ────────────────────────────────────────────────────────────────
const handleLogout = async () => {
  try {
    await logout()
    await navigateTo('/login')
  } catch (error) {
    console.error('Logout error:', error)
  }
}
</script>
