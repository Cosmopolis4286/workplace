<template>
  <div class="min-h-screen flex">
    <!-- Left Panel: Brand / Marketing -->
    <div class="hidden lg:flex lg:w-[45%] xl:w-[42%] relative flex-col bg-gradient-to-br from-workplace-red via-red-600 to-workplace-darkRed overflow-hidden">
      <!-- Geometric shapes -->
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-24 -left-24 w-80 h-80 bg-black/10 rounded-full blur-2xl"></div>
        <div class="absolute top-1/3 left-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <!-- Decorative circles -->
        <div class="absolute top-16 left-16 w-4 h-4 bg-white/30 rounded-full"></div>
        <div class="absolute top-32 left-32 w-2 h-2 bg-white/20 rounded-full"></div>
        <div class="absolute bottom-24 right-12 w-6 h-6 bg-white/20 rounded-full"></div>
        <div class="absolute bottom-48 right-28 w-3 h-3 bg-white/30 rounded-full"></div>
        <!-- Grid pattern -->
        <svg class="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" stroke-width="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <!-- Content -->
      <div class="relative flex flex-col h-full px-12 py-16">
        <!-- Logo -->
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
            <svg class="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08A7.2 7.2 0 0112 19.2z"/>
            </svg>
          </div>
          <span class="text-white font-black text-2xl tracking-tight">WorkPlace <span class="font-medium opacity-80">Manager</span></span>
        </div>

        <!-- Main content -->
        <div class="flex-1 flex flex-col justify-center space-y-10">
          <div class="space-y-4">
            <div class="inline-flex items-center px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-full border border-white/20">
              <span class="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              <span class="text-white/90 text-xs font-medium">Plataforma activa</span>
            </div>
            <h1 class="text-4xl xl:text-5xl font-black text-white leading-tight">
              Gestiona tu<br/>
              <span class="text-white/80">restaurante</span><br/>
              con precisión
            </h1>
            <p class="text-white/70 text-lg leading-relaxed max-w-sm">
              Todo lo que necesitas para administrar pedidos, inventario, clientes y más en un solo lugar.
            </p>
          </div>

          <!-- Feature list -->
          <div class="space-y-4">
            <div v-for="feature in features" :key="feature.label" class="flex items-center space-x-4 group">
              <div class="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20 flex-shrink-0 group-hover:bg-white/25 transition-colors duration-200">
                <component :is="feature.icon" class="w-5 h-5 text-white" />
              </div>
              <div>
                <p class="text-white font-semibold text-sm">{{ feature.label }}</p>
                <p class="text-white/60 text-xs">{{ feature.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats row -->
        <div class="grid grid-cols-3 gap-4 pt-8 border-t border-white/15">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <p class="text-white font-black text-2xl">{{ stat.value }}</p>
            <p class="text-white/60 text-xs mt-1">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Right Panel: Form -->
    <div class="flex-1 flex flex-col min-h-screen bg-gray-50">
      <!-- Top bar -->
      <div class="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-gray-100 bg-white">
        <!-- Mobile logo -->
        <div class="flex items-center space-x-2 lg:hidden">
          <div class="w-8 h-8 bg-gradient-to-br from-workplace-red to-red-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08A7.2 7.2 0 0112 19.2z"/>
            </svg>
          </div>
          <span class="font-black text-gray-900 text-lg">WorkPlace <span class="font-medium text-gray-500">Manager</span></span>
        </div>
        <div class="hidden lg:block"></div>

        <!-- Nav links slot -->
        <slot name="header-action" />
      </div>

      <!-- Main form area -->
      <div class="flex-1 flex flex-col items-center justify-center px-6 sm:px-10 py-10">
        <div class="w-full max-w-md space-y-8">
          <!-- Page heading -->
          <div class="space-y-2">
            <h2 class="text-3xl font-black text-gray-900 tracking-tight">{{ title }}</h2>
            <p v-if="description" class="text-gray-500 text-base">{{ description }}</p>
          </div>

          <!-- Form card -->
          <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
            <slot />
          </div>

          <!-- Footer links -->
          <div class="text-center">
            <slot name="footer" />
          </div>
        </div>
      </div>

      <!-- Bottom footer -->
      <div class="px-6 py-5 border-t border-gray-100 bg-white">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 max-w-md mx-auto w-full">
          <p>&copy; {{ currentYear }} WorkPlace Manager. Todos los derechos reservados.</p>
          <div class="flex items-center space-x-4">
            <NuxtLink to="/privacidad" class="hover:text-gray-600 transition-colors duration-150">Privacidad</NuxtLink>
            <NuxtLink to="/terminos" class="hover:text-gray-600 transition-colors duration-150">Términos</NuxtLink>
            <NuxtLink to="/soporte" class="hover:text-gray-600 transition-colors duration-150">Soporte</NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ChartBarIcon,
  ShoppingBagIcon,
  UsersIcon,
  TruckIcon
} from '@heroicons/vue/24/outline'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: 'Sistema de gestión para restaurantes' },
  description: { type: String, default: '' }
})

const currentYear = computed(() => new Date().getFullYear())

const features = [
  { icon: ChartBarIcon, label: 'Analytics en tiempo real', desc: 'Métricas y reportes al instante' },
  { icon: ShoppingBagIcon, label: 'Gestión de pedidos', desc: 'Control total del flujo de órdenes' },
  { icon: UsersIcon, label: 'CRM de clientes', desc: 'Segmentación y fidelización' },
  { icon: TruckIcon, label: 'Módulo de delivery', desc: 'Seguimiento de repartidores' },
]

const stats = [
  { value: '500+', label: 'Restaurantes' },
  { value: '99.9%', label: 'Uptime' },
  { value: '24/7', label: 'Soporte' },
]
</script>
