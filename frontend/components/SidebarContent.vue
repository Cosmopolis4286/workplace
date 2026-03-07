<template>
  <div class="flex flex-col h-full bg-gradient-to-b from-white via-white to-gray-50 overflow-hidden">

    <!-- Quick Access — driven by permissions, no role checks in template -->
    <div v-if="hasQuickAccess" class="flex-shrink-0 px-4 py-4 border-b border-gray-100">
      <h3 class="mb-3 text-xs font-bold text-gray-600 uppercase tracking-widest">Acceso Rápido</h3>
      <div class="grid grid-cols-3 gap-2">
        <NuxtLink
          v-for="item in quickAccessItems"
          :key="item.to"
          :to="item.to"
          @click="$emit('navigate')"
          :class="`group flex flex-col items-center justify-center p-3 bg-gradient-to-br ${item.gradient} text-white rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 relative overflow-hidden`"
        >
          <div class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <component :is="QUICK_ICONS[item.icon]" class="h-5 w-5 mb-1 group-hover:scale-110 transition-transform duration-200 relative z-10" />
          <span class="text-xs font-bold relative z-10">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Navigation Menu -->
    <nav class="flex-1 min-h-0 px-4 py-4 space-y-2 overflow-y-auto">

      <!-- Búsqueda (todos los roles) -->
      <NuxtLink
        to="/search"
        @click="$emit('navigate')"
        class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
        :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/search' }"
      >
        <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        Búsqueda
      </NuxtLink>

      <!-- Top-level items (dashboard, menu, inventario, servicios, solicitudes) -->
      <template v-for="item in topNavItems" :key="item.to">
        <NuxtLink
          v-if="item.permission === null || can(item.permission)"
          :to="item.to"
          @click="$emit('navigate')"
          class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
          :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === item.to }"
        >
          <component :is="NAV_ICONS[item.icon]" class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
          {{ item.label }}
        </NuxtLink>
      </template>

      <!-- Grouped sections (Ventas, Operaciones, Empresa) -->
      <template v-for="group in NAV_GROUPS" :key="group.key">
        <div v-if="groupVisible(group)" class="space-y-1">
          <div class="px-3 py-2">
            <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ group.label }}</span>
          </div>
          <div>
            <button
              @click="toggleDropdown(group.key)"
              class="group w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
              :class="{ 'bg-red-50 text-red-700': isDropdownActive(group.key) }"
            >
              <div class="flex items-center">
                <component :is="NAV_ICONS[group.icon]" class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" />
                {{ group.label }}
              </div>
              <svg class="h-4 w-4 transition-transform duration-200" :class="{ 'rotate-180': openDropdowns[group.key] }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>

            <div v-show="openDropdowns[group.key]" class="ml-6 mt-1 space-y-1 transition-all duration-200">
              <NuxtLink
                v-for="item in visibleItems(group)"
                :key="item.to"
                :to="item.to"
                @click="$emit('navigate')"
                class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
                :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === item.to }"
              >
                <component :is="NAV_ICONS[item.icon]" class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                {{ item.label }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>

      <!-- Administración (SUPERADMIN / ADMIN) — sin permiso en la matriz, es estructural -->
      <div v-if="isAdminOrAbove" class="space-y-1">
        <div class="px-3 py-2">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Administración</span>
        </div>
        <NuxtLink v-if="can('users:view')" to="/usuarios" @click="$emit('navigate')" class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200" :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/usuarios' }">
          <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
          Usuarios
        </NuxtLink>
        <NuxtLink to="/categorias-usuarios" @click="$emit('navigate')" class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200" :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/categorias-usuarios' }">
          <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
          Categorías
        </NuxtLink>
        <NuxtLink v-if="can('permissions:manage')" to="/permisos" @click="$emit('navigate')" class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200" :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/permisos' }">
          <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
          Permisos
        </NuxtLink>
        <NuxtLink v-if="can('audit:view')" to="/auditoria" @click="$emit('navigate')" class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200" :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/auditoria' }">
          <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
          Auditoría
        </NuxtLink>
        <NuxtLink v-if="can('logs:view')" to="/logs" @click="$emit('navigate')" class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200" :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/logs' }">
          <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>
          Logs del Sistema
        </NuxtLink>
      </div>

      <!-- Configuración (todos) -->
      <div class="space-y-1">
        <div class="px-3 py-2">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Configuración</span>
        </div>
        <div>
          <button
            @click="toggleDropdown('configuracion')"
            class="group w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
            :class="{ 'bg-red-50 text-red-700': isDropdownActive('configuracion') }"
          >
            <div class="flex items-center">
              <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"/>
              </svg>
              Configuración
            </div>
            <svg class="h-4 w-4 transition-transform duration-200" :class="{ 'rotate-180': openDropdowns.configuracion }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div v-show="openDropdowns.configuracion" class="ml-6 mt-1 space-y-1 transition-all duration-200">
            <NuxtLink to="/perfil" @click="$emit('navigate')" class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200" :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/perfil' }">
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
              Mi Perfil
            </NuxtLink>
            <NuxtLink v-if="can('settings:view')" to="/configuracion" @click="$emit('navigate')" class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200" :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/configuracion' }">
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              Configuración
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Footer -->
    <div class="flex-shrink-0 px-4 py-3 border-t border-gray-200/20">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
          <img v-if="user?.avatar" :src="user.avatar.startsWith('http') ? user.avatar : `${$config?.public?.apiUrl ?? ''}${user.avatar}`" class="w-full h-full object-cover">
          <svg v-else class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">{{ user?.firstName }} {{ user?.lastName }}</p>
          <p v-if="user?.username && can('services:view')" class="text-xs text-ifood-red truncate">
            <NuxtLink :to="`/p/${user.username}`" class="hover:underline">@{{ user.username }}</NuxtLink>
          </p>
          <p v-else class="text-xs text-gray-500 truncate">{{ user?.role }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { h, ref, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const { user } = useAuth()
const { can } = usePermissions()

const role = computed(() => user.value?.role ?? 'NORMAL')
// Solo para secciones estructurales sin permiso en la matriz (Administración)
const isAdminOrAbove = computed(() => ['SUPERADMIN', 'ADMIN'].includes(role.value))

defineEmits(['navigate'])

// ─── Iconos como render functions (evita repetir SVG inline en el template) ───

function svgIcon(d: string | string[], size = '0 0 24 24') {
  const paths = Array.isArray(d) ? d : [d]
  return {
    render() {
      return h('svg', { fill: 'none', stroke: 'currentColor', viewBox: size, 'aria-hidden': 'true' },
        paths.map(pd => h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: pd }))
      )
    },
  }
}

const NAV_ICONS: Record<string, ReturnType<typeof svgIcon>> = {
  dashboard:    svgIcon(['M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z', 'M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z']),
  menu:         svgIcon('M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253'),
  inventory:    svgIcon('M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'),
  services:     svgIcon('M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'),
  requests:     svgIcon('M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'),
  sales:        svgIcon('M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1'),
  analytics:    svgIcon('M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'),
  reports:      svgIcon('M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'),
  ventas_group: svgIcon('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'),
  ops_group:    svgIcon(['M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', 'M15 12a3 3 0 11-6 0 3 3 0 016 0z']),
  empresa_group:svgIcon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'),
  orders:       svgIcon('M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01'),
  appointments: svgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'),
  customers:    svgIcon('M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z'),
  delivery:     svgIcon('M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'),
  employees:    svgIcon('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'),
  branches:     svgIcon('M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'),
}

const QUICK_ICONS = NAV_ICONS

// ─── Definición declarativa — el permiso gatéa la visibilidad, no el rol ──────

interface NavItem { to: string; label: string; permission: string | null; icon: string }
interface NavGroup extends NavItem { items: NavItem[]; routes: string[] }
interface QuickItem extends NavItem { gradient: string }

// Top-level links (fuera de grupos)
const topNavItems: NavItem[] = [
  { to: '/dashboard',            label: 'Dashboard',  permission: 'dashboard:view', icon: 'dashboard' },
  { to: '/menu',                 label: 'Menú',       permission: 'menu:view',      icon: 'menu'      },
  { to: '/inventario',           label: 'Inventario', permission: 'inventory:view', icon: 'inventory' },
  { to: '/servicios',            label: 'Servicios',  permission: 'services:view',  icon: 'services'  },
  { to: '/solicitudes-servicio', label: 'Solicitudes',permission: 'service_requests:view', icon: 'requests' },
]

// Grupos con dropdown
const NAV_GROUPS: (Omit<NavGroup, keyof NavItem> & NavItem)[] = [
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

// Quick access — 3 items filtrados por permiso, límite de 3 para el grid
const QUICK_ACCESS: QuickItem[] = [
  { to: '/pedidos',              label: 'Pedidos',     permission: 'orders:view',           icon: 'orders',    gradient: 'from-blue-500 via-blue-600 to-blue-700'     },
  { to: '/solicitudes-servicio', label: 'Solicitudes', permission: 'service_requests:view', icon: 'requests',  gradient: 'from-blue-500 via-blue-600 to-blue-700'     },
  { to: '/gastos',               label: 'Gastos',      permission: 'expenses:view',         icon: 'sales',     gradient: 'from-red-500 via-red-600 to-red-700'        },
  { to: '/servicios',            label: 'Servicios',   permission: 'services:view',         icon: 'services',  gradient: 'from-purple-500 via-purple-600 to-purple-700'},
  { to: '/cliente-dashboard',    label: 'Mi Panel',    permission: 'orders:view',           icon: 'customers', gradient: 'from-green-500 via-green-600 to-emerald-700' },
  { to: '/dashboard',            label: 'Dashboard',   permission: 'dashboard:view',        icon: 'dashboard', gradient: 'from-green-500 via-green-600 to-emerald-700' },
]

const quickAccessItems = computed(() =>
  QUICK_ACCESS.filter(item => item.permission === null || can(item.permission)).slice(0, 3)
)
const hasQuickAccess = computed(() => quickAccessItems.value.length > 0)

function groupVisible(group: typeof NAV_GROUPS[0]): boolean {
  return group.items.some(item => item.permission === null || can(item.permission))
}

function visibleItems(group: typeof NAV_GROUPS[0]): NavItem[] {
  return group.items.filter(item => item.permission === null || can(item.permission))
}

// ─── Dropdowns ────────────────────────────────────────────────────────────────

const openDropdowns = ref<Record<string, boolean>>({
  ventas: false,
  operaciones: false,
  empresa: false,
  configuracion: false,
})

function autoOpenDropdowns() {
  const path = route.path
  Object.keys(openDropdowns.value).forEach(k => { openDropdowns.value[k] = false })
  for (const group of NAV_GROUPS) {
    if (group.routes.includes(path)) {
      openDropdowns.value[group.key] = true
      return
    }
  }
  if (['/perfil', '/configuracion'].includes(path)) openDropdowns.value.configuracion = true
}

watch(() => route.path, () => {
  autoOpenDropdowns()
  nextTick(() => {
    const activeEl = document.querySelector('nav a.bg-red-50')
    if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}, { immediate: true })

function toggleDropdown(key: string) {
  Object.keys(openDropdowns.value).forEach(k => {
    if (k !== key) openDropdowns.value[k] = false
  })
  openDropdowns.value[key] = !openDropdowns.value[key]
}

function isDropdownActive(key: string): boolean {
  const group = NAV_GROUPS.find(g => g.key === key)
  if (group) return openDropdowns.value[key] || group.routes.includes(route.path)
  if (key === 'configuracion') return openDropdowns.value.configuracion || ['/perfil', '/configuracion'].includes(route.path)
  return false
}
</script>

<style scoped>
nav::-webkit-scrollbar { width: 4px; }
nav::-webkit-scrollbar-track { background: transparent; }
nav::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.3); border-radius: 2px; }
nav::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.5); }
</style>
