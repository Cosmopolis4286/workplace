<template>
  <div class="flex h-full flex-col">
    <!-- Logo Section -->
    <div class="flex h-16 shrink-0 items-center px-4 border-b border-gray-200/20">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-lg">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
          </svg>
        </div>
        <div>
          <h1 class="text-lg font-bold text-gray-900">RestaurantePro</h1>
          <p class="text-xs text-gray-500">Panel de Control</p>
        </div>
      </div>
    </div>

    <!-- Quick Access Section -->
    <div class="px-4 py-3 border-b border-gray-200/20">
      <div class="mb-2">
        <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Acceso Rápido</span>
      </div>
      <NuxtLink 
        to="/gastos" 
        @click="$emit('navigate')"
        class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-red-50 to-red-100 text-red-700 hover:from-red-100 hover:to-red-200 transition-all duration-200 transform hover:scale-[1.02] shadow-sm hover:shadow-md"
      >
        <svg class="mr-3 h-5 w-5 text-red-600 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
        </svg>
        Control de Gastos
        <span class="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
          ¡Rápido!
        </span>
      </NuxtLink>
      <NuxtLink to="/pedidos" class="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
        <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <ShoppingCartIcon class="relative h-6 w-6 mx-auto mb-2 transform group-hover:scale-110 transition-transform duration-300" />
        <span class="relative text-sm">Pedidos</span>
      </NuxtLink>
    </div>

    <!-- Navigation Menu -->
    <nav class="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
      <!-- Dashboard -->
      <NuxtLink 
        to="/" 
        @click="$emit('navigate')"
        class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
        :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/' }"
      >
        <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z"/>
        </svg>
        Dashboard
      </NuxtLink>

      <!-- Menu -->
      <NuxtLink 
        to="/menu" 
        @click="$emit('navigate')"
        class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
        :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/menu' }"
      >
        <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        Menú
      </NuxtLink>

      <!-- Inventario -->
      <NuxtLink 
        to="/inventario" 
        @click="$emit('navigate')"
        class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
        :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/inventario' }"
      >
        <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
        </svg>
        Inventario
      </NuxtLink>

      <!-- Ventas & Analytics Group -->
      <div class="space-y-1">
        <div class="px-3 py-2">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ventas & Analytics</span>
        </div>
        
        <div>
          <button 
            @click="toggleDropdown('ventas')"
            class="group w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
            :class="{ 'bg-red-50 text-red-700': isDropdownActive('ventas') }"
          >
            <div class="flex items-center">
              <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              Ventas & Analytics
            </div>
            <svg 
              class="h-4 w-4 transition-transform duration-200"
              :class="{ 'rotate-180': openDropdowns.ventas }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          
          <div 
            v-show="openDropdowns.ventas"
            class="ml-6 mt-1 space-y-1 transition-all duration-200"
          >
            <NuxtLink 
              to="/ventas" 
              @click="$emit('navigate')"
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/ventas' }"
            >
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"/>
              </svg>
              Ventas
            </NuxtLink>
            
            <NuxtLink 
              to="/analytics" 
              @click="$emit('navigate')"
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/analytics' }"
            >
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Analytics
            </NuxtLink>
            
            <NuxtLink 
              to="/reportes" 
              @click="$emit('navigate')"
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/reportes' }"
            >
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              Reportes
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Operaciones Group -->
      <div class="space-y-1">
        <div class="px-3 py-2">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Operaciones</span>
        </div>
        
        <div>
          <button 
            @click="toggleDropdown('operaciones')"
            class="group w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-all duration-200"
            :class="{ 'bg-red-50 text-red-700': isDropdownActive('operaciones') }"
          >
            <div class="flex items-center">
              <svg class="mr-3 h-5 w-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Operaciones
            </div>
            <svg 
              class="h-4 w-4 transition-transform duration-200"
              :class="{ 'rotate-180': openDropdowns.operaciones }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          
          <div 
            v-show="openDropdowns.operaciones"
            class="ml-6 mt-1 space-y-1 transition-all duration-200"
          >
            <NuxtLink 
              to="/pedidos" 
              @click="$emit('navigate')"
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/pedidos' }"
            >
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01"/>
              </svg>
              Pedidos
            </NuxtLink>
            
            <NuxtLink 
              to="/agendamientos" 
              @click="$emit('navigate')"
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/agendamientos' }"
            >
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Agendamientos
            </NuxtLink>
            
            <NuxtLink 
              to="/clientes" 
              @click="$emit('navigate')"
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/clientes' }"
            >
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
              </svg>
              Clientes
            </NuxtLink>
            
            <NuxtLink 
              to="/delivery" 
              @click="$emit('navigate')"
              class="group flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200"
              :class="{ 'bg-red-50 text-red-700 border-r-2 border-red-500': $route.path === '/delivery' }"
            >
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Delivery
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Configuración Group -->
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
            <svg 
              class="h-4 w-4 transition-transform duration-200"
              :class="{ 'rotate-180': openDropdowns.configuracion }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          
          <div 
            v-show="openDropdowns.configuracion"
            class="ml-6 mt-1 space-y-1 transition-all duration-200"
          >
            <button class="group w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200">
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Mi Perfil
            </button>
            
            <button class="group w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200">
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
              </svg>
              Restaurante
            </button>
            
            <button class="group w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all duration-200">
              <svg class="mr-3 h-4 w-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Preferencias
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-gray-200/20">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
          <svg class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">Admin</p>
          <p class="text-xs text-gray-500 truncate">admin@restaurante.com</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// Define emits
defineEmits(['navigate'])

// Reactive state for dropdown menus
const openDropdowns = ref({
  ventas: false,
  operaciones: false,
  configuracion: false
})

// Auto-open dropdown based on current route
const autoOpenDropdowns = () => {
  const path = route.path
  
  // Reset all dropdowns
  Object.keys(openDropdowns.value).forEach(key => {
    openDropdowns.value[key] = false
  })
  
  // Auto-open based on current page
  if (['/ventas', '/analytics', '/reportes'].includes(path)) {
    openDropdowns.value.ventas = true
  } else if (['/pedidos', '/agendamientos', '/clientes', '/delivery'].includes(path)) {
    openDropdowns.value.operaciones = true
  }
}

// Watch route changes to auto-open dropdowns
watch(() => route.path, autoOpenDropdowns, { immediate: true })

// Toggle dropdown function
const toggleDropdown = (dropdown) => {
  // Close all other dropdowns
  Object.keys(openDropdowns.value).forEach(key => {
    if (key !== dropdown) {
      openDropdowns.value[key] = false
    }
  })
  
  // Toggle the selected dropdown
  openDropdowns.value[dropdown] = !openDropdowns.value[dropdown]
}

// Check if dropdown should be active (open or contains current page)
const isDropdownActive = (dropdown) => {
  const path = route.path
  
  switch (dropdown) {
    case 'ventas':
      return openDropdowns.value.ventas || ['/ventas', '/analytics', '/reportes'].includes(path)
    case 'operaciones':
      return openDropdowns.value.operaciones || ['/pedidos', '/agendamientos', '/clientes', '/delivery'].includes(path)
    case 'configuracion':
      return openDropdowns.value.configuracion
    default:
      return false
  }
}
</script>

<style scoped>
/* Custom scrollbar for navigation */
nav::-webkit-scrollbar {
  width: 4px;
}

nav::-webkit-scrollbar-track {
  background: transparent;
}

nav::-webkit-scrollbar-thumb {
  background: rgba(156, 163, 175, 0.3);
  border-radius: 2px;
}

nav::-webkit-scrollbar-thumb:hover {
  background: rgba(156, 163, 175, 0.5);
}

/* Smooth transitions for dropdown animations */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Pulse animation for quick access badge */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>