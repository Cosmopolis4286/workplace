<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">
    <!-- Navbar -->
    <nav class="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-gradient-to-br from-ifood-red to-red-700 rounded-lg flex items-center justify-center">
            <span class="text-white font-black text-sm">iF</span>
          </div>
          <span class="font-black text-gray-900 text-lg">iFood <span class="text-ifood-red">Manager</span></span>
        </div>
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/login"
            class="text-sm font-semibold text-gray-700 hover:text-ifood-red transition-colors px-4 py-2 rounded-lg hover:bg-red-50"
          >
            Iniciar sesión
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="text-sm font-semibold text-white bg-ifood-red hover:bg-red-700 transition-colors px-4 py-2 rounded-lg shadow-sm"
          >
            Crear cuenta gratis
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Hero -->
    <section class="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div class="text-center max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-ifood-red text-sm font-semibold px-4 py-2 rounded-full mb-6">
          <div class="w-2 h-2 bg-ifood-red rounded-full animate-pulse" />
          Plataforma todo-en-uno para tu restaurante
        </div>
        <h1 class="text-5xl sm:text-6xl font-black text-gray-900 leading-tight mb-6">
          Gestiona tu restaurante
          <span class="text-ifood-red">sin complicaciones</span>
        </h1>
        <p class="text-xl text-gray-500 mb-10 leading-relaxed">
          Pedidos, inventario, menú, reportes y más — todo en un solo lugar.
          Diseñado para restaurantes que quieren crecer.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <NuxtLink
            to="/register"
            class="inline-flex items-center justify-center gap-2 bg-ifood-red hover:bg-red-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
          >
            Empezar gratis
            <ArrowRightIcon class="w-5 h-5" />
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-bold px-8 py-4 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 text-lg"
          >
            Ver demo
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div class="text-center mb-14">
        <h2 class="text-3xl font-black text-gray-900 mb-3">Todo lo que necesita tu restaurante</h2>
        <p class="text-gray-500 text-lg">Herramientas profesionales, fáciles de usar</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="feature in features"
          :key="feature.title"
          class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
        >
          <div :class="['w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-sm', feature.bg]">
            <component :is="feature.icon" class="w-6 h-6 text-white" />
          </div>
          <h3 class="font-bold text-gray-900 mb-2">{{ feature.title }}</h3>
          <p class="text-gray-500 text-sm leading-relaxed">{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-20 px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mx-auto bg-gradient-to-br from-ifood-red to-red-700 rounded-3xl p-12 text-center shadow-2xl">
        <h2 class="text-3xl font-black text-white mb-4">¿Listo para empezar?</h2>
        <p class="text-red-100 text-lg mb-8">Crea tu cuenta en menos de 2 minutos. Sin tarjeta de crédito.</p>
        <NuxtLink
          to="/register"
          class="inline-flex items-center gap-2 bg-white text-ifood-red font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-red-50 transition-all duration-200 text-lg"
        >
          Crear cuenta gratis
          <ArrowRightIcon class="w-5 h-5" />
        </NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-8 px-4 border-t border-gray-100 text-center text-sm text-gray-400">
      © {{ new Date().getFullYear() }} iFood Manager. Todos los derechos reservados.
    </footer>
  </div>
</template>

<script setup lang="ts">
import {
  ShoppingCartIcon,
  CubeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  TruckIcon,
  ArrowRightIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: false })

const features = [
  {
    title: 'Gestión de Pedidos',
    description: 'Recibe y gestiona todos tus pedidos en tiempo real desde un solo panel.',
    icon: ShoppingCartIcon,
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
  },
  {
    title: 'Control de Inventario',
    description: 'Monitorea tu stock, recibe alertas de bajo inventario y evita pérdidas.',
    icon: CubeIcon,
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
  },
  {
    title: 'Menú Digital',
    description: 'Crea y actualiza tu menú fácilmente. Agrega fotos, precios y categorías.',
    icon: DocumentTextIcon,
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
  },
  {
    title: 'Analytics y Reportes',
    description: 'Visualiza el rendimiento de tu restaurante con gráficas e informes detallados.',
    icon: ChartBarIcon,
    bg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
  },
  {
    title: 'Gestión de Clientes',
    description: 'Conoce a tus clientes frecuentes, historial de pedidos y preferencias.',
    icon: UsersIcon,
    bg: 'bg-gradient-to-br from-pink-500 to-red-500',
  },
  {
    title: 'Control de Delivery',
    description: 'Administra tus repartidores, rutas y tiempos de entrega en tiempo real.',
    icon: TruckIcon,
    bg: 'bg-gradient-to-br from-teal-500 to-cyan-600',
  },
]
</script>
