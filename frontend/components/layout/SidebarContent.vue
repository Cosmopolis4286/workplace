<template>
  <div class="flex flex-col h-full" :class="dark ? 'text-gray-300' : 'text-gray-700'">

    <!-- ── Quick access (solo expandido) ───────────────────────────────── -->
    <QuickAccessGrid
      v-if="hasQuickAccess && !collapsed"
      :items="quickAccessItems"
      :dark="dark"
      @navigate="$emit('navigate')"
    />

    <!-- ── Nav ─────────────────────────────────────────────────────────── -->
    <nav class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-2" :class="collapsed ? 'px-1.5' : 'px-2'">

      <!-- Búsqueda -->
      <NavLink to="/search" label="Búsqueda" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
        <template #icon>
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </template>
      </NavLink>

      <!-- Top-level items -->
      <template v-for="item in topSection?.items ?? []" :key="item.id">
        <NavLink
          :to="item.to"
          :label="item.label"
          :dark="dark"
          :collapsed="collapsed"
          :unread-count="item.to === '/service-requests' ? unreadServiceRequestsCount : 0"
          @click="$emit('navigate')"
        >
          <template #icon><component :is="NAV_ICONS[item.icon]" class="h-5 w-5" /></template>
        </NavLink>
      </template>

      <!-- Grouped sections (Ventas & Analytics, Operaciones, Empresa) -->
      <template v-for="group in groupSections" :key="group.id">
        <SidebarNavSection
          :label="group.label"
          :items="group.items"
          :dark="dark"
          :collapsed="collapsed"
          :unread-service-requests-count="unreadServiceRequestsCount"
          @navigate="$emit('navigate')"
        />
      </template>

      <!-- Administración: el backend ya omite la sección si no hay items visibles -->
      <SidebarNavSection
        v-if="adminSection"
        :label="adminSection.label"
        :items="adminSection.items"
        :dark="dark"
        :collapsed="collapsed"
        :unread-service-requests-count="unreadServiceRequestsCount"
        @navigate="$emit('navigate')"
      />

      <!-- ── Mi Cuenta ───────────────────────────────────────────────────── -->
      <SidebarNavSection
        v-if="miCuentaSection"
        :label="miCuentaSection.label"
        :items="miCuentaSection.items"
        :dark="dark"
        :collapsed="collapsed"
        :unread-service-requests-count="unreadServiceRequestsCount"
        @navigate="$emit('navigate')"
      />

      <!-- ── Negocio: solo si hay algo que mostrar para este rol ───────────── -->
      <SidebarNavSection
        v-if="negocioSection"
        :label="negocioSection.label"
        :items="negocioSection.items"
        :dark="dark"
        :collapsed="collapsed"
        :unread-service-requests-count="unreadServiceRequestsCount"
        @navigate="$emit('navigate')"
      />

    </nav>

    <!-- ── Footer / user ───────────────────────────────────────────────── -->
    <SidebarUserFooter
      :user="user"
      :dark="dark"
      :collapsed="collapsed"
      :can-view-services="can('services:view')"
      @navigate="$emit('navigate')"
      @logout="handleLogout"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { MAX_QUICK_ACCESS, type QuickAccessCandidate } from '~/composables/dashboard/useQuickAccess'
import { NAV_ICONS } from '~/config/sidebarNavIcons'
import NavLink from '~/components/layout/NavLink.vue'
import QuickAccessGrid from '~/components/layout/QuickAccessGrid.vue'
import SidebarNavSection from '~/components/layout/SidebarNavSection.vue'
import SidebarUserFooter from '~/components/layout/SidebarUserFooter.vue'

const route = useRoute()
const { user, logout } = useAuth()
const { can, initialized: permissionsInitialized, fetchPermissions } = usePermissions()
const { loadModules } = useModules()
const {
  loaded: navigationLoaded, loadNavigation,
  topSection, adminSection, miCuentaSection, negocioSection, groupSections,
} = useNavigation()
const { savedIds: savedQuickAccessIds, availableFor: availableQuickAccess } = useQuickAccess()
const { unreadCount: unreadServiceRequestsCount, refresh: refreshUnreadBadge } = useServiceRequestsUnreadBadge()
const { notifications } = useNotifications()

onMounted(() => {
  loadModules()
  loadNavigation()
  if (!permissionsInitialized.value) fetchPermissions()
  refreshUnreadBadge()
})

// Reutiliza el WebSocket ya activo de useNotifications (mismo patrón que el
// banner de /service-requests) en vez de un intervalo de polling nuevo.
watch(notifications, () => { refreshUnreadBadge() })

const role = computed(() => user.value?.role ?? 'NORMAL')

// El árbol de navegación ya viene filtrado por el backend (permisos, rol,
// módulos, categoría) — el frontend solo espera a que cargue y pinta.
const navReady = computed(() => navigationLoaded.value)

async function handleLogout() {
  try {
    await logout()
  } finally {
    await navigateTo('/login')
  }
}

const props = withDefaults(
  defineProps<{ collapsed?: boolean; dark?: boolean }>(),
  { collapsed: false, dark: false }
)
defineEmits(['navigate'])

// ─── Nav data: el árbol completo (topSection, groupSections, adminSection,
// miCuentaSection, negocioSection) viene de useNavigation() — ver arriba.

// El catálogo de candidatos, MAX_QUICK_ACCESS y su propio chequeo de
// visibilidad (canSee interno) viven en useQuickAccess.ts, compartido con la
// página de configuración (perfil.vue) — no se le pasa una función canSee
// propia de este componente, usa su default interno.
const quickAccessItems = computed(() => {
  const available = availableQuickAccess(role.value)
  const savedIds = savedQuickAccessIds.value
  if (savedIds.length > 0) {
    const byId = new Map(available.map(i => [i.id, i]))
    const chosen = savedIds.map(id => byId.get(id)).filter((i): i is QuickAccessCandidate => !!i)
    if (chosen.length > 0) return chosen.slice(0, MAX_QUICK_ACCESS)
  }
  return available.slice(0, MAX_QUICK_ACCESS)
})
const hasQuickAccess = computed(() => quickAccessItems.value.length > 0)

// ─── Auto-open dropdowns on route change ─────────────────────────────────────
watch(() => route.path, () => {
  nextTick(() => {
    const activeEl = document.querySelector('nav a[aria-current="page"]')
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}, { immediate: true })
</script>

<style scoped>
/* Nav scrollbar */
nav::-webkit-scrollbar       { width: 3px; }
nav::-webkit-scrollbar-track { background: transparent; }
nav::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.25); border-radius: 9999px; }
nav::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.45); }
</style>
