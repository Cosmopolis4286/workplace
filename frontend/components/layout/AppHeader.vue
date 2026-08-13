<template>
  <header
    class="shadow-sm border-b sticky top-0 z-40 transition-colors duration-300"
    :class="isDark
      ? 'bg-gray-900 border-gray-700/60'
      : 'bg-white/95 backdrop-blur-lg border-gray-200'"
  >
    <div class="px-4 sm:px-6 lg:px-8 relative">
      <div class="flex justify-between h-16">

        <!-- Left: Toggle + Page title -->
        <div class="flex items-center gap-3">
          <!-- Menu toggle -->
          <button
            @click="$emit('toggle-sidebar')"
            :class="[
              '-ml-2 p-3 rounded-xl transition-all duration-300 transform hover:scale-110 active:scale-95',
              sidebarOpen
                ? 'text-workplace-red bg-red-50'
                : isDark
                  ? 'text-gray-400 hover:text-workplace-red hover:bg-white/10'
                  : 'text-gray-400 hover:text-workplace-red hover:bg-red-50'
            ]"
            aria-label="Toggle sidebar"
          >
            <Bars3Icon class="h-6 w-6 hidden lg:block" />
            <Transition mode="out-in" enter-active-class="transition duration-200" enter-from-class="opacity-0 rotate-90" enter-to-class="opacity-100 rotate-0" leave-active-class="transition duration-200" leave-from-class="opacity-100 rotate-0" leave-to-class="opacity-0 -rotate-90">
              <XMarkIcon v-if="sidebarOpen" key="close" class="h-6 w-6 lg:hidden" />
              <Bars3Icon v-else key="menu" class="h-6 w-6 lg:hidden" />
            </Transition>
          </button>

          <!-- Page title -->
          <div v-if="currentPageTitle" class="hidden md:flex items-center gap-2">
            <component :is="currentPageIcon" class="h-5 w-5" :class="isDark ? 'text-gray-500' : 'text-gray-400'" />
            <span class="text-base font-semibold" :class="isDark ? 'text-gray-200' : 'text-gray-800'">{{ currentPageTitle }}</span>
          </div>
        </div>

        <!-- Search -->
        <div class="flex-1 flex items-center justify-center px-2 sm:px-6">
          <div class="w-full max-w-2xl">
            <GlobalSearchBar />
          </div>
        </div>

        <!-- Right side -->
        <div class="flex items-center gap-3">
          <!-- Public profile shortcut (COMMERCE / FREELANCER con username) -->
          <a
            v-if="publicProfileUrl"
            :href="publicProfileUrl"
            target="_blank"
            rel="noopener"
            class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors duration-200"
            :class="isDark ? 'bg-red-900/20 border-red-800/40 hover:bg-red-900/30' : 'bg-red-50 border-red-100 hover:bg-red-100'"
            title="Ver mi perfil público"
          >
            <BuildingStorefrontIcon class="h-4 w-4 text-workplace-red" />
            <span class="text-sm font-medium text-workplace-red truncate max-w-32">Perfil público</span>
            <ArrowTopRightOnSquareIcon class="h-3.5 w-3.5 text-workplace-red/70" />
          </a>

          <!-- Notifications -->
          <NotificationPanel />

          <!-- Profile dropdown -->
          <div class="relative" ref="profileDropdown">
            <button
              @click="showProfileMenu = !showProfileMenu"
              class="flex items-center gap-2 p-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-workplace-red/40 transition-all duration-200"
              :class="isDark ? 'hover:bg-white/10' : 'hover:bg-red-50'"
            >
              <div class="relative h-9 w-9 rounded-xl overflow-hidden shadow-md ring-2 ring-workplace-red/20 flex-shrink-0">
                <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover">
                <div v-else class="h-full w-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center">
                  <span class="text-white font-bold text-sm">{{ userInitials }}</span>
                </div>
              </div>
              <div class="hidden md:block text-left">
                <p class="text-sm font-semibold leading-tight" :class="isDark ? 'text-white' : 'text-gray-800'">{{ fullName }}</p>
                <p class="text-xs leading-tight" :class="isDark ? 'text-gray-400' : 'text-gray-500'">{{ roleLabel }}</p>
              </div>
              <ChevronDownIcon
                class="h-4 w-4 transition-transform duration-300"
                :class="[showProfileMenu ? 'rotate-180 text-workplace-red' : '', isDark ? 'text-gray-400' : 'text-gray-400']"
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
              <div
                v-if="showProfileMenu"
                class="absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl py-2 z-50 border transition-colors"
                :class="isDark
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-white border-gray-100'"
              >
                <!-- User info -->
                <div class="px-4 py-3 border-b" :class="isDark ? 'border-gray-700' : 'border-gray-100'">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-xl overflow-hidden shadow-sm flex-shrink-0 ring-2 ring-workplace-red/20">
                      <img v-if="avatarUrl" :src="avatarUrl" alt="" class="h-full w-full object-cover">
                      <div v-else class="h-full w-full bg-gradient-to-br from-workplace-red to-red-700 flex items-center justify-center">
                        <span class="text-white font-bold text-sm">{{ userInitials }}</span>
                      </div>
                    </div>
                    <div class="min-w-0">
                      <p class="text-sm font-semibold truncate" :class="isDark ? 'text-white' : 'text-gray-900'">{{ fullName }}</p>
                      <p class="text-xs truncate" :class="isDark ? 'text-gray-400' : 'text-gray-500'">{{ userEmail }}</p>
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-0.5 bg-workplace-red/10 text-workplace-red">
                        {{ roleLabel }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Links -->
                <NuxtLink
                  to="/profile"
                  @click="showProfileMenu = false"
                  class="flex items-center px-4 py-2.5 text-sm transition-all duration-200 gap-3"
                  :class="isDark ? 'text-gray-300 hover:bg-white/8 hover:text-white' : 'text-gray-700 hover:bg-red-50 hover:text-workplace-red'"
                >
                  <UserIcon class="h-4 w-4 flex-shrink-0" />
                  Mi Perfil
                </NuxtLink>
                <NuxtLink
                  to="/settings"
                  @click="showProfileMenu = false"
                  class="flex items-center px-4 py-2.5 text-sm transition-all duration-200 gap-3"
                  :class="isDark ? 'text-gray-300 hover:bg-white/8 hover:text-white' : 'text-gray-700 hover:bg-red-50 hover:text-workplace-red'"
                >
                  <CogIcon class="h-4 w-4 flex-shrink-0" />
                  Configuración
                </NuxtLink>
                <NuxtLink
                  v-if="can('wallets:use')"
                  to="/wallet"
                  @click="showProfileMenu = false"
                  class="flex items-center px-4 py-2.5 text-sm transition-all duration-200 gap-3"
                  :class="isDark ? 'text-gray-300 hover:bg-white/8 hover:text-white' : 'text-gray-700 hover:bg-red-50 hover:text-workplace-red'"
                >
                  <WalletIcon class="h-4 w-4 flex-shrink-0" />
                  Billetera
                </NuxtLink>

                <!-- Dark mode toggle -->
                <div
                  class="px-4 py-2.5 flex items-center justify-between gap-3 border-t"
                  :class="isDark ? 'border-gray-700' : 'border-gray-100'"
                >
                  <div class="flex items-center gap-3 text-sm" :class="isDark ? 'text-gray-300' : 'text-gray-700'">
                    <component
                      :is="isDark ? MoonIcon : SunIcon"
                      class="h-4 w-4 flex-shrink-0"
                      :class="isDark ? 'text-workplace-red' : 'text-gray-400'"
                    />
                    <span>{{ isDark ? 'Modo oscuro' : 'Modo claro' }}</span>
                  </div>
                  <button
                    @click="toggleColorMode"
                    class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-workplace-red/40"
                    :class="isDark ? 'bg-workplace-red' : 'bg-gray-200'"
                    :aria-checked="isDark"
                    role="switch"
                  >
                    <span
                      class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out"
                      :class="isDark ? 'translate-x-4' : 'translate-x-0'"
                    />
                  </button>
                </div>

                <!-- Logout -->
                <div class="pt-1">
                  <button
                    @click="handleLogout"
                    class="w-full flex items-center px-4 py-2.5 text-sm text-workplace-red transition-all duration-200 gap-3"
                    :class="isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'"
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
  SunIcon,
  MoonIcon,
  WalletIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/vue/24/outline'
import { useAuth } from '~/composables/useAuth'

defineProps({
  sidebarOpen: Boolean,
})
defineEmits(['toggle-sidebar'])

const route = useRoute()
const { logout, user } = useAuth()
const { can } = usePermissions()
const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl

// ── Color mode ────────────────────────────────────────────────────────────
const { isDark, toggle: toggleColorMode } = useColorMode()


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

const avatarUrl = computed(() => {
  const { getAssetUrl } = useAssetUrl()
  return getAssetUrl(user.value?.avatar)
})

const userEmail = computed(() => user.value?.email ?? '')

const publicProfileUrl = computed(() => {
  const u = user.value
  if (!u?.username) return ''
  if (u.role !== 'COMMERCE' && u.role !== 'FREELANCER') return ''
  return `/p/${u.username}`
})

const ROLE_LABELS = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  COMMERCE: 'Comercio',
  FREELANCER: 'Freelancer',
  NORMAL: 'Usuario',
}
const roleLabel = computed(() => ROLE_LABELS[user.value?.role] ?? user.value?.role ?? '')

// ── Page title / icon ──────────────────────────────────────────────────────
const PAGE_MAP = {
  '/search':           { title: 'Búsqueda',         icon: HomeIcon },
  '/dashboard':        { title: 'Dashboard',       icon: HomeIcon },
  '/menu':             { title: 'Menú',             icon: Squares2X2Icon },
  '/customers':        { title: 'Clientes',         icon: UsersIcon },
  '/appointments':     { title: 'Agendamientos',    icon: CalendarDaysIcon },
  '/delivery':         { title: 'Delivery',         icon: TruckIcon },
  '/customer-dashboard':{ title: 'Pedidos',          icon: ClipboardDocumentListIcon },
  '/expenses':         { title: 'Gastos',           icon: BanknotesIcon },
  '/analytics':        { title: 'Analíticas',       icon: ChartBarIcon },
  '/settings':         { title: 'Configuración',    icon: CogIcon },
  '/profile':          { title: 'Mi Perfil',        icon: UserIcon },
  '/wallet':           { title: 'Billetera',        icon: WalletIcon },
  '/notificaciones':   { title: 'Notificaciones',   icon: BellIcon },
  '/audit-log':        { title: 'Auditoría',        icon: ClipboardDocumentListIcon },
  '/logs':             { title: 'Logs del Sistema', icon: BellIcon },
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
