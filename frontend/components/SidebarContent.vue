<template>
  <div class="flex flex-col h-full" :class="dark ? 'text-gray-300' : 'text-gray-700'">

    <!-- ── Quick access (solo expandido) ───────────────────────────────── -->
    <div v-if="hasQuickAccess && !collapsed" class="px-3 pt-4 pb-3 border-b" :class="dark ? 'border-white/10' : 'border-gray-100'">
      <p class="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">Acceso rápido</p>
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
      <template v-for="item in topNavItems" :key="item.to">
        <NavLink
          v-if="canSee(item.permission)"
          :to="item.to"
          :label="item.label"
          :dark="dark"
          :collapsed="collapsed"
          @click="$emit('navigate')"
        >
          <template #icon><component :is="NAV_ICONS[item.icon]" class="h-5 w-5" /></template>
        </NavLink>
      </template>

      <!-- Grouped sections -->
      <template v-for="group in NAV_GROUPS" :key="group.key">
        <template v-if="groupVisible(group)">

          <!-- COLLAPSED: flat icons -->
          <template v-if="collapsed">
            <div class="my-1 mx-1.5 h-px" :class="dark ? 'bg-white/10' : 'bg-gray-100'" />
            <NavLink
              v-for="item in visibleItems(group)"
              :key="item.to"
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
              v-for="item in visibleItems(group)"
              :key="item.to"
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
      </template>

      <!-- Administración: visible si el usuario tiene al menos un permiso admin -->
      <template v-if="hasAdminItems">
        <template v-if="!collapsed">
          <div class="mt-3 mb-1 px-2">
            <span class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">Administración</span>
          </div>
        </template>
        <template v-else>
          <div class="my-1 mx-1.5 h-px" :class="dark ? 'bg-white/10' : 'bg-gray-100'" />
        </template>
        <NavLink v-if="can('users:view')" to="/usuarios" label="Usuarios" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon><component :is="NAV_ICONS.employees" class="h-5 w-5" /></template>
        </NavLink>
        <NavLink v-if="can('categories_global:view')" to="/categorias" label="Categorías" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon><component :is="NAV_ICONS.menu" class="h-5 w-5" /></template>
        </NavLink>
        <NavLink v-if="can('search_tabs:view')" to="/search-tabs" label="Tabs de Búsqueda" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon>
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </template>
        </NavLink>
        <NavLink v-if="can('permissions:manage')" to="/permisos" label="Permisos" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon><component :is="NAV_ICONS.requests" class="h-5 w-5" /></template>
        </NavLink>
        <NavLink v-if="can('audit:view')" to="/auditoria" label="Auditoría" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon><component :is="NAV_ICONS.orders" class="h-5 w-5" /></template>
        </NavLink>
        <NavLink v-if="can('logs:view')" to="/logs" label="Logs" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon><component :is="NAV_ICONS.reports" class="h-5 w-5" /></template>
        </NavLink>
        <NavLink v-if="can('plans:view')" to="/planes" label="Planes" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon><component :is="NAV_ICONS.sales" class="h-5 w-5" /></template>
        </NavLink>
        <NavLink v-if="can('exchange_rates:view')" to="/tasas-cambio" label="Tasas de Cambio" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
          <template #icon><component :is="NAV_ICONS.analytics" class="h-5 w-5" /></template>
        </NavLink>
      </template>

      <!-- Configuración -->
      <template v-if="!collapsed">
        <div class="mt-3 mb-1 px-2">
          <span class="text-[10px] font-bold uppercase tracking-widest" :class="dark ? 'text-gray-500' : 'text-gray-400'">Configuración</span>
        </div>
      </template>
      <template v-else>
        <div class="my-1 mx-1.5 h-px" :class="dark ? 'bg-white/10' : 'bg-gray-100'" />
      </template>
      <NavLink to="/perfil" label="Mi Perfil" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
        <template #icon><component :is="NAV_ICONS.customers" class="h-5 w-5" /></template>
      </NavLink>
      <NavLink v-if="can('settings:view')" to="/configuracion" label="Configuración" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
        <template #icon><component :is="NAV_ICONS.ops_group" class="h-5 w-5" /></template>
      </NavLink>
      <!-- Mi Plan: solo para comercios/freelancers que pueden tener una suscripción propia -->
      <NavLink v-if="role === 'COMMERCE' || role === 'FREELANCER'" to="/mi-plan" label="Mi Plan" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
        <template #icon><component :is="NAV_ICONS.sales" class="h-5 w-5" /></template>
      </NavLink>
      <!-- Ver Planes: siempre visible (página pública) -->
      <NavLink to="/precios" label="Ver Planes" :dark="dark" :collapsed="collapsed" @click="$emit('navigate')">
        <template #icon><component :is="NAV_ICONS.menu" class="h-5 w-5" /></template>
      </NavLink>

    </nav>

    <!-- ── Footer / user ───────────────────────────────────────────────── -->
    <div
      class="flex-shrink-0 border-t"
      :class="[collapsed ? 'px-1.5 py-2' : 'px-3 py-2.5', dark ? 'border-white/10' : 'border-gray-100']"
    >
      <div class="flex items-center" :class="collapsed ? 'justify-center' : 'gap-2.5'">
        <!-- Avatar -->
        <div
          class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ring-2"
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
            <p class="text-sm font-semibold truncate leading-tight" :class="dark ? 'text-white' : 'text-gray-900'">
              {{ user?.firstName }} {{ user?.lastName }}
            </p>
            <p v-if="user?.username && can('services:view')" class="text-xs text-workplace-red truncate leading-tight">
              <NuxtLink :to="`/p/${user.username}`" class="hover:underline">@{{ user.username }}</NuxtLink>
            </p>
            <p v-else class="text-xs truncate leading-tight" :class="dark ? 'text-gray-500' : 'text-gray-400'">
              {{ user?.role }}
            </p>
          </div>
        </Transition>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { h, ref, computed, watch, nextTick, onMounted, defineComponent, resolveComponent } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const { user } = useAuth()
const { can, userCategory } = usePermissions()
const { hasModule, loadModules } = useModules()

onMounted(() => loadModules())

const role = computed(() => user.value?.role ?? 'NORMAL')

// Sección Administración visible si el usuario tiene al menos un permiso admin
const ADMIN_PERMISSIONS = [
  'users:view', 'categories_global:view', 'permissions:manage',
  'audit:view', 'logs:view', 'plans:view', 'exchange_rates:view',
]
const hasAdminItems = computed(() => ADMIN_PERMISSIONS.some(p => can(p)))

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
  corridas:     svgIcon('M13 10V3L4 14h7v7l9-11h-7z'),
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
  delivery:     svgIcon('M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
  employees:    svgIcon('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'),
  branches:     svgIcon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'),
}

const QUICK_ICONS = NAV_ICONS

// ─── Nav data ────────────────────────────────────────────────────────────────
interface NavItem { to: string; label: string; permission: string | null; icon: string }
interface NavGroup extends NavItem { items: NavItem[]; routes: string[]; key: string }
interface QuickItem extends NavItem { gradient: string }

interface NavItemExtended extends NavItem { commerceOnly?: boolean; normalOnly?: boolean }
const topNavItemsDef: NavItemExtended[] = [
  { to: '/dashboard',            label: 'Dashboard',   permission: 'dashboard:view',       icon: 'dashboard', commerceOnly: false, normalOnly: false },
  { to: '/menu',                 label: 'Menú',        permission: 'menu:view',             icon: 'menu',      commerceOnly: true,  normalOnly: false },
  { to: '/inventario',           label: 'Inventario',  permission: 'inventory:view',        icon: 'inventory', commerceOnly: true,  normalOnly: false },
  { to: '/servicios',            label: 'Servicios',   permission: 'services:view',         icon: 'services',  commerceOnly: false, normalOnly: false },
  { to: '/solicitudes-servicio', label: 'Solicitudes', permission: 'service_requests:view', icon: 'requests',  commerceOnly: false, normalOnly: false },
  { to: '/corridas',             label: 'Corridas',    permission: 'corridas:view',         icon: 'corridas',  commerceOnly: false, normalOnly: false },
  { to: '/billetera',             label: 'Billetera',   permission: 'wallets:use',           icon: 'wallet',    commerceOnly: false, normalOnly: false },
  { to: '/mis-pedidos',          label: 'Mis Pedidos', permission: null,                      icon: 'orders',    commerceOnly: false, normalOnly: true  },
]
const topNavItems = computed(() =>
  topNavItemsDef.filter(i => {
    if (i.normalOnly && role.value !== 'NORMAL') return false
    if (!i.normalOnly && i.commerceOnly && role.value === 'NORMAL') return false
    return true
  })
)

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Ventas & Analytics', key: 'ventas', icon: 'ventas_group', permission: null,
    routes: ['/ventas', '/analytics', '/reportes'],
    items: [
      { to: '/ventas',    label: 'Ventas',    permission: 'sales:view',     icon: 'sales'     },
      { to: '/analytics', label: 'Analytics', permission: 'analytics:view', icon: 'analytics' },
      { to: '/reportes',  label: 'Reportes',  permission: 'reports:view',   icon: 'reports'   },
    ],
  },
  {
    label: 'Operaciones', key: 'operaciones', icon: 'ops_group', permission: null,
    routes: ['/pedidos', '/agendamientos', '/clientes', '/delivery'],
    items: [
      { to: '/pedidos',       label: 'Pedidos',       permission: 'orders:view',       icon: 'orders'       },
      { to: '/agendamientos', label: 'Agendamientos', permission: 'appointments:view', icon: 'appointments' },
      { to: '/clientes',      label: 'Clientes',      permission: 'customers:view',    icon: 'customers'    },
      { to: '/delivery',      label: 'Delivery',      permission: 'delivery:view',     icon: 'delivery'     },
    ],
  },
  {
    label: 'Empresa', key: 'empresa', icon: 'empresa_group', permission: null,
    routes: ['/empleados', '/sucursales'],
    items: [
      { to: '/empleados',  label: 'Empleados',  permission: 'employees:view', icon: 'employees' },
      { to: '/sucursales', label: 'Sucursales', permission: 'branches:view',  icon: 'branches'  },
    ],
  },
]

interface QuickItemExtended extends QuickItem { normalOnly?: boolean }
const QUICK_ACCESS: QuickItemExtended[] = [
  { to: '/pedidos',              label: 'Pedidos',     permission: 'orders:view',           icon: 'orders',    gradient: 'bg-gradient-to-br from-workplace-red to-red-700',         normalOnly: false },
  { to: '/mis-pedidos',          label: 'Pedidos',     permission: null,                    icon: 'orders',    gradient: 'bg-gradient-to-br from-green-500 to-emerald-600',    normalOnly: true  },
  { to: '/solicitudes-servicio', label: 'Solicitudes', permission: 'service_requests:view', icon: 'requests',  gradient: 'bg-gradient-to-br from-red-400 to-rose-600',              normalOnly: false },
  { to: '/gastos',               label: 'Gastos',      permission: 'expenses:view',         icon: 'sales',     gradient: 'bg-gradient-to-br from-red-600 to-rose-800',              normalOnly: false },
  { to: '/servicios',            label: 'Servicios',   permission: 'services:view',         icon: 'services',  gradient: 'bg-gradient-to-br from-gray-700 to-gray-900',             normalOnly: false },
  { to: '/cliente-dashboard',    label: 'Mi Panel',    permission: 'orders:view',           icon: 'customers', gradient: 'bg-gradient-to-br from-rose-500 to-workplace-red',        normalOnly: false },
  { to: '/dashboard',            label: 'Dashboard',   permission: 'dashboard:view',        icon: 'dashboard', gradient: 'bg-gradient-to-br from-workplace-red to-red-800',         normalOnly: false },
]

const quickAccessItems = computed(() =>
  QUICK_ACCESS.filter(i => {
    if (i.normalOnly && role.value !== 'NORMAL') return false
    if (!i.normalOnly && role.value === 'NORMAL') return false
    return canSee(i.permission)
  }).slice(0, 3)
)
const hasQuickAccess = computed(() => quickAccessItems.value.length > 0)

function canSee(permission: string | null): boolean {
  if (permission === null) return true
  const module = permission.split(':')[0]
  if (permission === 'menu:view') {
    return can(permission) && hasModule(module) && userCategory.value === 'Comida'
  }
  return can(permission) && hasModule(module)
}

function groupVisible(group: NavGroup): boolean {
  return group.items.some(i => canSee(i.permission))
}
function visibleItems(group: NavGroup): NavItem[] {
  return group.items.filter(i => canSee(i.permission))
}

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
