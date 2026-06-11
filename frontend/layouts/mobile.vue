<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">
    <!-- Mobile sidebar overlay -->
    <AppSidebar 
      :open="sidebarOpen" 
      @update:open="toggleSidebar" 
      class="lg:hidden"
    />
    
    <!-- Desktop sidebar -->
    <AppSidebar 
      :open="true" 
      class="hidden lg:block"
    />

    <!-- Main content area -->
    <div
      :class="[
        'transition-all duration-300 ease-in-out',
        'lg:pl-72', // Desktop sidebar space
        {
          'lg:pl-0': !desktopSidebarOpen
        }
      ]"
    >
      <!-- Mobile header -->
      <AppHeaderMobile 
        v-if="isMobile"
        @toggle-sidebar="toggleSidebar" 
        :sidebar-open="sidebarOpen"
        :user="currentUser"
        :current-page="currentPage"
      />
      
      <!-- Desktop header -->
      <AppHeader 
        v-else
        @toggle-sidebar="toggleDesktopSidebar" 
        :sidebar-open="desktopSidebarOpen"
      />

      <!-- Main content -->
      <main 
        :class="[
          'transition-all duration-300',
          isMobile ? 'py-4' : 'py-8'
        ]"
      >
        <div 
          :class="[
            'max-w-7xl mx-auto',
            isMobile ? 'px-3' : 'px-4 sm:px-6 lg:px-8'
          ]"
        >
          <!-- Mobile page header -->
          <div v-if="isMobile && showMobilePageHeader" class="mb-4">
            <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div class="flex items-center justify-between mb-2">
                <h1 class="text-xl font-bold text-gray-800">{{ currentPageTitle }}</h1>
                <TouchButton 
                  v-if="currentPageActions.length > 0"
                  variant="primary"
                  size="sm"
                  @click="handlePrimaryAction"
                >
                  {{ currentPageActions[0].label }}
                </TouchButton>
              </div>
              <p v-if="currentPageSubtitle" class="text-sm text-gray-600">{{ currentPageSubtitle }}</p>
            </div>
          </div>

          <!-- Page content -->
          <div :class="{ 'pb-20': isMobile && hasMobileBottomNav }">
            <slot />
          </div>
        </div>
      </main>

      <!-- Mobile bottom navigation -->
      <div 
        v-if="isMobile && showMobileBottomNav"
        class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40"
      >
        <div class="flex items-center justify-around py-2">
          <button
            v-for="item in mobileNavItems"
            :key="item.key"
            @click="navigateToMobile(item.route)"
            :class="[
              'flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200',
              'min-h-[60px] min-w-[60px] touch-manipulation',
              item.active 
                ? 'text-workplace-red bg-red-50' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            ]"
          >
            <component :is="item.icon" class="h-5 w-5 mb-1" />
            <span class="text-xs font-medium">{{ item.label }}</span>
          </button>
        </div>
      </div>

      <!-- Footer (hidden on mobile with bottom nav) -->
      <AppFooter v-if="!isMobile || !showMobileBottomNav" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMobileDetection } from '~/composables/useMobileDetection'

// Components
import AppSidebar from '~/components/AppSidebar.vue'
import AppHeader from '~/components/AppHeader.vue'
import AppHeaderMobile from '~/components/AppHeaderMobile.vue'
import AppFooter from '~/components/AppFooter.vue'
import TouchButton from '~/components/ui/TouchButton.vue'

// Props
const props = defineProps({
  showMobileBottomNav: {
    type: Boolean,
    default: true
  },
  showMobilePageHeader: {
    type: Boolean,
    default: true
  }
})

// Composables
const route = useRoute()
const router = useRouter()
const { isMobile } = useMobileDetection()

// State
const sidebarOpen = ref(false)
const desktopSidebarOpen = ref(true)

// Mock user data - replace with actual auth
const currentUser = ref({
  fullName: 'Juan Pérez',
  role: 'Administrador',
  commerceName: 'WorkPlace Central',
  avatarUrl: ''
})

// Computed properties
const currentPage = computed(() => {
  const routeMeta = route.meta || {}
  return {
    title: routeMeta.title || route.name?.toString().replace(/([A-Z])/g, ' $1').trim() || 'Dashboard',
    subtitle: routeMeta.subtitle || '',
    icon: routeMeta.icon || null,
    actions: routeMeta.actions || []
  }
})

const currentPageTitle = computed(() => currentPage.value.title)
const currentPageSubtitle = computed(() => currentPage.value.subtitle)
const currentPageActions = computed(() => currentPage.value.actions)

const hasMobileBottomNav = computed(() => props.showMobileBottomNav && isMobile.value)

// Mobile navigation items
const mobileNavItems = computed(() => [
  {
    key: 'dashboard',
    label: 'Inicio',
    icon: 'HomeIcon', // Replace with actual icon import
    route: '/dashboard',
    active: route.name === 'dashboard'
  },
  {
    key: 'appointments',
    label: 'Citas',
    icon: 'CalendarIcon', // Replace with actual icon import
    route: '/agendamientos',
    active: route.name === 'agendamientos'
  },
  {
    key: 'services',
    label: 'Servicios',
    icon: 'CogIcon', // Replace with actual icon import
    route: '/servicios',
    active: route.name === 'servicios'
  },
  {
    key: 'clients',
    label: 'Clientes',
    icon: 'UsersIcon', // Replace with actual icon import
    route: '/clientes',
    active: route.name === 'clientes'
  },
  {
    key: 'profile',
    label: 'Perfil',
    icon: 'UserIcon', // Replace with actual icon import
    route: '/profile',
    active: route.name === 'profile'
  }
])

// Methods
const toggleSidebar = (value?: boolean) => {
  sidebarOpen.value = typeof value === 'boolean' ? value : !sidebarOpen.value
}

const toggleDesktopSidebar = (value?: boolean) => {
  desktopSidebarOpen.value = typeof value === 'boolean' ? value : !desktopSidebarOpen.value
}

const navigateToMobile = (routePath: string) => {
  router.push(routePath)
}

const handlePrimaryAction = () => {
  if (currentPageActions.value.length > 0) {
    const action = currentPageActions.value[0]
    // Handle action based on type
    if (action.route) {
      router.push(action.route)
    } else if (action.handler) {
      action.handler()
    }
  }
}

// Lifecycle
onMounted(() => {
  if (!isMobile.value && window.innerWidth >= 1024) {
    setTimeout(() => {
      desktopSidebarOpen.value = true
    }, 100)
  }
})

// Handle responsive changes
const handleResize = () => {
  if (!isMobile.value && window.innerWidth < 1024) {
    sidebarOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.touch-manipulation {
  touch-action: manipulation;
}

/* Mobile optimizations */
@media (max-width: 767px) {
  .pb-20 {
    padding-bottom: 5rem; /* Space for bottom nav */
  }
}
</style>
