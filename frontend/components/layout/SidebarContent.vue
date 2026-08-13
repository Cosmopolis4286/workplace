<template>
  <div class="flex flex-col h-full" :class="dark ? 'text-gray-300' : 'text-gray-700'">

    <!-- ── Quick access (solo expandido) ───────────────────────────────── -->
    <div v-if="hasQuickAccess && !collapsed" class="px-3 pt-4 pb-3 border-b" :class="dark ? 'border-white/10' : 'border-gray-100'">
      <div class="mb-2 px-1 flex items-center justify-between">
        <p class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">Acceso rápido</p>
        <NuxtLink
          to="/profile?tab=quick-access"
          title="Configurar accesos rápidos"
          class="rounded-md p-0.5 transition-colors duration-150"
          :class="dark ? 'text-gray-500 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-workplace-red hover:bg-gray-100'"
          @click="$emit('navigate')"
        >
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </NuxtLink>
      </div>
      <div class="grid grid-cols-3 gap-1.5">
        <NuxtLink
          v-for="item in quickAccessItems"
          :key="item.to"
          :to="item.to"
          @click="$emit('navigate')"
          class="group relative flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl text-white overflow-hidden transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm"
          :class="item.gradient"
        >
          <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors duration-200 rounded-xl" />
          <component :is="NAV_ICONS[item.icon]" class="h-5 w-5 relative" />
          <span class="text-[10px] font-semibold relative leading-none">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

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
          @click="$emit('navigate')"
        >
          <template #icon><component :is="NAV_ICONS[item.icon]" class="h-5 w-5" /></template>
        </NavLink>
      </template>

      <!-- Grouped sections (Ventas & Analytics, Operaciones, Empresa) -->
      <template v-for="group in groupSections" :key="group.id">

        <!-- COLLAPSED: flat icons -->
        <template v-if="collapsed">
          <div class="my-1 mx-1.5 h-px" :class="dark ? 'bg-white/10' : 'bg-gray-100'" />
          <NavLink
            v-for="item in group.items"
            :key="item.id"
            :to="item.to"
            :label="item.label"
            :dark="dark"
            :collapsed="true"
            @click="$emit('navigate')"
          >
            <template #icon><component :is="NAV_ICONS[item.icon]" class="h-5 w-5" /></template>
          </NavLink>
        </template>

        <!-- EXPANDED: section header + collapsible group -->
        <template v-else>
          <div class="mt-3 mb-1 px-2">
            <span class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">
              {{ group.label }}
            </span>
          </div>

          <NavLink
            v-for="item in group.items"
            :key="item.id"
            :to="item.to"
            :label="item.label"
            :dark="dark"
            :collapsed="false"
            @click="$emit('navigate')"
          >
            <template #icon><component :is="NAV_ICONS[item.icon]" class="h-5 w-5" /></template>
          </NavLink>
        </template>
      </template>

      <!-- Administración: el backend ya omite la sección si no hay items visibles -->
      <template v-if="adminSection">
        <template v-if="!collapsed">
          <div class="mt-3 mb-1 px-2">
            <span class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">{{ adminSection.label }}</span>
          </div>
        </template>
        <template v-else>
          <div class="my-1 mx-1.5 h-px" :class="dark ? 'bg-white/10' : 'bg-gray-100'" />
        </template>
        <NavLink
          v-for="item in adminSection.items"
          :key="item.id"
          :to="item.to"
          :label="item.label"
          :dark="dark"
          :collapsed="collapsed"
          @click="$emit('navigate')"
        >
          <template #icon><component :is="NAV_ICONS[item.icon]" class="h-5 w-5" /></template>
        </NavLink>
      </template>

      <!-- ── Mi Cuenta ───────────────────────────────────────────────────── -->
      <template v-if="miCuentaSection">
        <template v-if="!collapsed">
          <div class="mt-3 mb-1 px-2">
            <span class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">{{ miCuentaSection.label }}</span>
          </div>
        </template>
        <template v-else>
          <div class="my-1 mx-1.5 h-px" :class="dark ? 'bg-white/10' : 'bg-gray-100'" />
        </template>
        <NavLink
          v-for="item in miCuentaSection.items"
          :key="item.id"
          :to="item.to"
          :label="item.label"
          :dark="dark"
          :collapsed="collapsed"
          @click="$emit('navigate')"
        >
          <template #icon><component :is="NAV_ICONS[item.icon]" class="h-5 w-5" /></template>
        </NavLink>
      </template>

      <!-- ── Negocio: solo si hay algo que mostrar para este rol ───────────── -->
      <template v-if="negocioSection">
        <template v-if="!collapsed">
          <div class="mt-3 mb-1 px-2">
            <span class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">{{ negocioSection.label }}</span>
          </div>
        </template>
        <template v-else>
          <div class="my-1 mx-1.5 h-px" :class="dark ? 'bg-white/10' : 'bg-gray-100'" />
        </template>
        <NavLink
          v-for="item in negocioSection.items"
          :key="item.id"
          :to="item.to"
          :label="item.label"
          :dark="dark"
          :collapsed="collapsed"
          @click="$emit('navigate')"
        >
          <template #icon><component :is="NAV_ICONS[item.icon]" class="h-5 w-5" /></template>
        </NavLink>
      </template>

    </nav>

    <!-- ── Footer / user ───────────────────────────────────────────────── -->
    <div
      class="flex-shrink-0 border-t"
      :class="[collapsed ? 'px-1.5 py-2' : 'px-2.5 py-2', dark ? 'border-white/10' : 'border-gray-100']"
    >
      <div class="flex items-center" :class="collapsed ? 'flex-col gap-1.5' : 'gap-1'">
        <!-- User -> /profile -->
        <NuxtLink
          to="/profile"
          class="group flex items-center rounded-lg transition-colors duration-150 min-w-0"
          :class="[
            collapsed ? 'justify-center w-10 h-10 mx-auto' : 'flex-1 gap-2.5 px-2 py-1.5',
            dark ? 'hover:bg-white/10' : 'hover:bg-gray-50',
          ]"
          :title="collapsed ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() : undefined"
          @click="$emit('navigate')"
        >
          <!-- Avatar -->
          <div
            class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ring-2 transition-shadow duration-150 group-hover:ring-workplace-red/40"
            :class="dark ? 'bg-gray-700 ring-white/10' : 'bg-gray-100 ring-gray-200'"
          >
            <img v-if="user?.avatar" :src="useAssetUrl().getAssetUrl(user.avatar)" class="w-full h-full object-cover" />
            <svg v-else class="w-4 h-4" :class="dark ? 'text-gray-400' : 'text-gray-500'" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
            </svg>
          </div>
          <!-- Info -->
          <Transition name="fade-text">
            <div v-if="!collapsed" class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate leading-tight" :class="dark ? 'text-white group-hover:text-white' : 'text-gray-900'">
                {{ user?.firstName }} {{ user?.lastName }}
              </p>
              <p v-if="user?.username && can('services:view')" class="text-xs text-workplace-red truncate leading-tight">
                @{{ user.username }}
              </p>
              <p v-else class="text-xs truncate leading-tight" :class="dark ? 'text-gray-500' : 'text-gray-400'">
                {{ user?.role }}
              </p>
            </div>
          </Transition>
        </NuxtLink>

        <!-- Logout -->
        <button
          type="button"
          class="flex-shrink-0 flex items-center justify-center rounded-lg transition-colors duration-150"
          :class="[
            collapsed ? 'w-10 h-10' : 'w-9 h-9',
            dark ? 'text-gray-400 hover:bg-red-500/15 hover:text-red-400' : 'text-gray-400 hover:bg-red-50 hover:text-red-600',
          ]"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          @click="handleLogout"
        >
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { h, ref, computed, watch, nextTick, onMounted, defineComponent, resolveComponent } from 'vue'
import { useRoute } from 'vue-router'
import { MAX_QUICK_ACCESS, type QuickAccessCandidate } from '~/composables/dashboard/useQuickAccess'

const route = useRoute()
const { user, logout } = useAuth()
const { can, initialized: permissionsInitialized, fetchPermissions } = usePermissions()
const { loadModules } = useModules()
const {
  loaded: navigationLoaded, loadNavigation,
  topSection, adminSection, miCuentaSection, negocioSection, groupSections,
} = useNavigation()
const { savedIds: savedQuickAccessIds, availableFor: availableQuickAccess } = useQuickAccess()

onMounted(() => {
  loadModules()
  loadNavigation()
  if (!permissionsInitialized.value) fetchPermissions()
})

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

// ─── Inline NavLink component ─────────────────────────────────────────────────
const NavLink = defineComponent({
  props: {
    to:        { type: String,  required: true },
    label:     { type: String,  required: true },
    dark:      { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(p, { slots, emit }) {
    const route = useRoute()
    const isActive = computed(() => route.path === p.to)

    return () => {
      const darkActive   = 'bg-workplace-red/15 text-workplace-red'
      const darkInactive = 'text-gray-400 hover:bg-white/10 hover:text-white'
      const lightActive  = 'bg-red-50 text-workplace-red border-r-2 border-workplace-red'
      const lightInactive= 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'

      const stateClass = isActive.value
        ? (p.dark ? darkActive   : lightActive)
        : (p.dark ? darkInactive : lightInactive)

      const wrapClass = p.collapsed
        ? `flex items-center justify-center w-10 h-10 mx-auto rounded-xl transition-all duration-150 ${stateClass}`
        : `flex items-center gap-3 w-full px-2.5 py-2 rounded-lg transition-all duration-150 ${stateClass}`

      return h(resolveComponent('NuxtLink'), {
        to: p.to,
        class: wrapClass,
        title: p.collapsed ? p.label : undefined,
        onClick: () => emit('click'),
      }, () => [
        slots.icon?.(),
        !p.collapsed
          ? h('span', { class: 'text-sm font-medium truncate flex-1' }, p.label)
          : null,
      ])
    }
  },
})

// ─── SVG icon factory ────────────────────────────────────────────────────────
function svgIcon(d: string | string[], vb = '0 0 24 24') {
  const paths = Array.isArray(d) ? d : [d]
  return {
    render: () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: vb, 'aria-hidden': 'true' },
      paths.map(pd => h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: pd }))
    ),
  }
}

const NAV_ICONS: Record<string, ReturnType<typeof svgIcon>> = {
  dashboard:    svgIcon(['M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z','M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z']),
  menu:         svgIcon('M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'),
  inventory:    svgIcon('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'),
  services:     svgIcon('M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'),
  requests:     svgIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'),
  rides:        svgIcon('M13 10V3L4 14h7v7l9-11h-7z'),
  wallet:       svgIcon('M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m4-4h-6a2 2 0 100 4h6V9z'),
  sales:        svgIcon('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'),
  analytics:    svgIcon('M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'),
  reports:      svgIcon('M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'),
  ventas_group: svgIcon('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'),
  ops_group:    svgIcon(['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z','M15 12a3 3 0 11-6 0 3 3 0 016 0z']),
  empresa_group:svgIcon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'),
  orders:       svgIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'),
  appointments: svgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'),
  customers:    svgIcon('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'),
  profile:      svgIcon('M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z'),
  home:         svgIcon('m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25'),
  delivery:     svgIcon('M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
  employees:    svgIcon('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'),
  jobs:         svgIcon('M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.653v-2.322c0-1.121-.75-2.104-1.83-2.399a48.132 48.132 0 00-9.24 0c-1.08.295-1.83 1.278-1.83 2.399v2.322c0 .652.288 1.257.75 1.653m16.5 0v.001c0 .653-.286 1.257-.75 1.653m-15.75 0a2.181 2.181 0 01-.75-1.653m0 0v-.002c0-.653.286-1.258.75-1.654m14.25 0a48.31 48.31 0 00-9-.001'),
  branches:     svgIcon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'),
  modules:      svgIcon('M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z'),
  cash:         svgIcon(['M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z']),
}

const QUICK_ICONS = NAV_ICONS

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
const openDropdowns = ref<Record<string, boolean>>({
  ventas: false, operaciones: false, empresa: false, configuracion: false,
})

watch(() => route.path, () => {
  nextTick(() => {
    const activeEl = document.querySelector('nav a[aria-current="page"]')
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}, { immediate: true })
</script>

<style scoped>
/* Footer text fade */
.fade-text-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; transition-delay: 0.04s; }
.fade-text-leave-active { transition: opacity 0.1s ease; }
.fade-text-enter-from   { opacity: 0; transform: translateX(-4px); }
.fade-text-leave-to     { opacity: 0; }

/* Nav scrollbar */
nav::-webkit-scrollbar       { width: 3px; }
nav::-webkit-scrollbar-track { background: transparent; }
nav::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.25); border-radius: 9999px; }
nav::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.45); }
</style>
