<template>
  <div class="min-h-screen bg-white font-sans">

    <!-- ─── Navbar ─────────────────────────────────────────────────────────── -->
    <nav class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <!-- Logo -->
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 bg-workplace-red rounded-lg flex items-center justify-center shadow-sm">
            <svg class="w-4.5 h-4.5 text-white w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08A7.2 7.2 0 0112 19.2z"/>
            </svg>
          </div>
          <span class="font-black text-gray-900 text-lg tracking-tight">WorkPlace <span class="font-medium text-gray-500">Manager</span></span>
        </div>

        <!-- Desktop nav -->
        <div class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="#features" class="hover:text-gray-900 transition-colors duration-150">Funciones</a>
          <a href="#how" class="hover:text-gray-900 transition-colors duration-150">Cómo funciona</a>
          <a href="#testimonials" class="hover:text-gray-900 transition-colors duration-150">Testimonios</a>
        </div>

        <!-- CTA -->
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/login"
            class="hidden sm:block text-sm font-semibold text-gray-700 hover:text-workplace-red px-4 py-2 rounded-lg hover:bg-red-50 transition-all duration-150"
          >
            Iniciar sesión
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="text-sm font-semibold text-white bg-workplace-red hover:bg-red-700 px-4 py-2 rounded-lg shadow-sm transition-all duration-150"
          >
            Empezar gratis
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- ─── Hero ───────────────────────────────────────────────────────────── -->
    <section class="pt-28 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <!-- Background blobs -->
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="absolute -top-40 right-0 w-[600px] h-[600px] bg-gradient-to-br from-red-50 via-red-100/50 to-transparent rounded-full blur-3xl opacity-60"></div>
        <div class="absolute bottom-0 -left-20 w-96 h-96 bg-gradient-to-tr from-orange-50 to-transparent rounded-full blur-3xl opacity-40"></div>
      </div>

      <div class="max-w-7xl mx-auto relative">
        <div class="grid lg:grid-cols-2 gap-12 items-center">
          <!-- Text -->
          <div class="space-y-8">
            <div class="space-y-4">
              <div class="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-workplace-red text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide">
                <span class="w-1.5 h-1.5 bg-workplace-red rounded-full animate-pulse"></span>
                Plataforma todo-en-uno
              </div>
              <h1 class="text-5xl sm:text-6xl font-black text-gray-900 leading-[1.05] tracking-tight">
                Gestiona tu<br/>
                restaurante<br/>
                <span class="text-workplace-red">sin complicaciones</span>
              </h1>
              <p class="text-lg text-gray-500 leading-relaxed max-w-lg">
                Pedidos, inventario, menú, clientes, delivery y reportes — todo desde un solo panel.
                Diseñado para restaurantes que quieren crecer.
              </p>
            </div>

            <!-- CTA buttons -->
            <div class="flex flex-col sm:flex-row gap-3">
              <NuxtLink
                to="/register"
                class="inline-flex items-center justify-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-7 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 text-base"
              >
                Crear cuenta gratis
                <ArrowRightIcon class="w-4 h-4" />
              </NuxtLink>
              <NuxtLink
                to="/login"
                class="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-7 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 text-base"
              >
                <PlayIcon class="w-4 h-4 text-workplace-red" />
                Ver demo
              </NuxtLink>
            </div>

            <!-- Trust badges -->
            <div class="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400">
              <span class="flex items-center gap-1.5">
                <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5]" />
                Sin tarjeta de crédito
              </span>
              <span class="flex items-center gap-1.5">
                <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5]" />
                Configura en 5 minutos
              </span>
              <span class="flex items-center gap-1.5">
                <CheckIcon class="w-4 h-4 text-green-500 stroke-[2.5]" />
                Soporte 24/7
              </span>
            </div>
          </div>

          <!-- Stats panel (mock dashboard preview) -->
          <div class="relative hidden lg:block">
            <!-- Main card -->
            <div class="bg-white rounded-2xl border border-gray-200 shadow-xl p-6 space-y-5">
              <!-- Header -->
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs text-gray-400 font-medium">Panel general</p>
                  <p class="font-black text-gray-900 text-lg">Mi Restaurante</p>
                </div>
                <div class="flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  En línea
                </div>
              </div>

              <!-- KPI row -->
              <div class="grid grid-cols-3 gap-3">
                <div v-for="kpi in heroKpis" :key="kpi.label" class="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p class="text-xs text-gray-400 mb-1">{{ kpi.label }}</p>
                  <p class="font-black text-gray-900 text-xl">{{ kpi.value }}</p>
                  <p class="text-xs font-semibold mt-1" :class="kpi.trend > 0 ? 'text-green-500' : 'text-red-500'">
                    {{ kpi.trend > 0 ? '↑' : '↓' }} {{ Math.abs(kpi.trend) }}%
                  </p>
                </div>
              </div>

              <!-- Mini bar chart -->
              <div>
                <p class="text-xs text-gray-400 font-medium mb-3">Ingresos esta semana</p>
                <div class="flex items-end gap-1.5 h-16">
                  <div
                    v-for="(bar, i) in chartBars"
                    :key="i"
                    class="flex-1 rounded-t-md transition-all duration-300"
                    :class="i === chartBars.length - 1 ? 'bg-workplace-red' : 'bg-gray-100'"
                    :style="{ height: `${bar}%` }"
                  ></div>
                </div>
                <div class="flex justify-between mt-1.5">
                  <span v-for="d in ['L', 'M', 'X', 'J', 'V', 'S', 'D']" :key="d" class="text-[10px] text-gray-300 flex-1 text-center">{{ d }}</span>
                </div>
              </div>

              <!-- Recent orders -->
              <div>
                <p class="text-xs text-gray-400 font-medium mb-3">Pedidos recientes</p>
                <div class="space-y-2">
                  <div v-for="order in heroOrders" :key="order.id" class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <div class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                        {{ order.initials }}
                      </div>
                      <div>
                        <p class="text-xs font-semibold text-gray-700">{{ order.name }}</p>
                        <p class="text-[10px] text-gray-400">{{ order.time }}</p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-gray-900">{{ order.amount }}</span>
                      <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full" :class="order.statusClass">{{ order.status }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Floating badge -->
            <div class="absolute -bottom-5 -left-6 bg-white rounded-xl border border-gray-200 shadow-lg px-4 py-3 flex items-center gap-3">
              <div class="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center">
                <ArrowTrendingUpIcon class="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p class="text-xs text-gray-400">Ventas hoy</p>
                <p class="text-sm font-black text-gray-900">+$4,280 <span class="text-green-500 font-bold">↑12%</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Social proof strip ─────────────────────────────────────────────── -->
    <div class="border-y border-gray-100 bg-gray-50 py-5">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-center gap-x-12 gap-y-4 items-center">
        <div v-for="stat in socialStats" :key="stat.label" class="text-center">
          <p class="text-2xl font-black text-gray-900">{{ stat.value }}</p>
          <p class="text-xs text-gray-500 font-medium mt-0.5">{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <!-- ─── Features ───────────────────────────────────────────────────────── -->
    <section id="features" class="py-24 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16 space-y-3">
          <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">Funcionalidades</p>
          <h2 class="text-4xl font-black text-gray-900 tracking-tight">Todo lo que necesita tu restaurante</h2>
          <p class="text-gray-500 text-lg max-w-xl mx-auto">Herramientas profesionales, pensadas para el día a día de tu negocio.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 hover:-translate-y-1 transition-all duration-200 cursor-default"
          >
            <div :class="['w-11 h-11 rounded-xl flex items-center justify-center mb-5', feature.bg]">
              <component :is="feature.icon" class="w-5 h-5 text-white" />
            </div>
            <h3 class="font-bold text-gray-900 mb-2">{{ feature.title }}</h3>
            <p class="text-gray-500 text-sm leading-relaxed">{{ feature.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── How it works ───────────────────────────────────────────────────── -->
    <section id="how" class="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-16 space-y-3">
          <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">Cómo funciona</p>
          <h2 class="text-4xl font-black text-gray-900 tracking-tight">Empieza en 3 pasos</h2>
          <p class="text-gray-500 text-lg">Sin instalaciones, sin complicaciones.</p>
        </div>

        <div class="grid md:grid-cols-3 gap-8 relative">
          <!-- Connecting line (desktop) -->
          <div class="hidden md:block absolute top-10 left-[calc(16.67%-0px)] right-[calc(16.67%-0px)] h-px bg-gray-200" style="left: 17%; right: 17%;"></div>

          <div v-for="(step, i) in steps" :key="i" class="flex flex-col items-center text-center space-y-4 relative">
            <div class="w-20 h-20 rounded-2xl bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm relative z-10">
              <component :is="step.icon" class="w-8 h-8 text-workplace-red" />
            </div>
            <div class="w-7 h-7 bg-workplace-red text-white rounded-full flex items-center justify-center text-xs font-black -mt-2 shadow-sm">
              {{ i + 1 }}
            </div>
            <div class="space-y-1.5">
              <h3 class="font-bold text-gray-900">{{ step.title }}</h3>
              <p class="text-sm text-gray-500 leading-relaxed">{{ step.desc }}</p>
            </div>
          </div>
        </div>

        <div class="text-center mt-12">
          <NuxtLink
            to="/register"
            class="inline-flex items-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-8 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150"
          >
            Comenzar ahora — es gratis
            <ArrowRightIcon class="w-4 h-4" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- ─── Testimonials ───────────────────────────────────────────────────── -->
    <section id="testimonials" class="py-24 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <div class="text-center mb-16 space-y-3">
          <p class="text-xs font-bold text-workplace-red uppercase tracking-widest">Testimonios</p>
          <h2 class="text-4xl font-black text-gray-900 tracking-tight">Lo que dicen nuestros clientes</h2>
        </div>

        <div class="grid md:grid-cols-3 gap-6">
          <div
            v-for="t in testimonials"
            :key="t.name"
            class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 space-y-4"
          >
            <!-- Stars -->
            <div class="flex gap-0.5">
              <StarIcon v-for="n in 5" :key="n" class="w-4 h-4 text-yellow-400 fill-yellow-400" />
            </div>
            <p class="text-gray-600 text-sm leading-relaxed italic">"{{ t.quote }}"</p>
            <div class="flex items-center gap-3 pt-2 border-t border-gray-50">
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" :class="t.avatarBg">
                {{ t.initials }}
              </div>
              <div>
                <p class="text-sm font-bold text-gray-900">{{ t.name }}</p>
                <p class="text-xs text-gray-400">{{ t.role }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── CTA Banner ─────────────────────────────────────────────────────── -->
    <section class="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div class="max-w-4xl mx-auto bg-gradient-to-br from-workplace-red to-red-700 rounded-3xl p-12 text-center shadow-2xl relative overflow-hidden">
        <!-- Decorative circles -->
        <div class="absolute -top-16 -right-16 w-56 h-56 bg-white/10 rounded-full"></div>
        <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full"></div>

        <div class="relative space-y-6">
          <div class="space-y-3">
            <h2 class="text-3xl sm:text-4xl font-black text-white">¿Listo para transformar tu restaurante?</h2>
            <p class="text-red-100 text-lg max-w-xl mx-auto">
              Únete a más de 500 restaurantes que ya gestionan su negocio con WorkPlace Manager.
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <NuxtLink
              to="/register"
              class="inline-flex items-center justify-center gap-2 bg-white text-workplace-red font-bold px-8 py-3.5 rounded-xl shadow-sm hover:shadow-md hover:bg-red-50 transition-all duration-150 text-base"
            >
              Crear cuenta gratis
              <ArrowRightIcon class="w-4 h-4" />
            </NuxtLink>
            <NuxtLink
              to="/login"
              class="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white font-semibold px-8 py-3.5 rounded-xl border border-white/30 transition-all duration-150 text-base"
            >
              Ya tengo cuenta
            </NuxtLink>
          </div>

          <p class="text-red-200 text-sm">Sin tarjeta de crédito · Configura en 5 min · Cancela cuando quieras</p>
        </div>
      </div>
    </section>

    <!-- ─── Footer ─────────────────────────────────────────────────────────── -->
    <footer class="border-t border-gray-100 bg-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <!-- Brand -->
          <div class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 bg-workplace-red rounded-lg flex items-center justify-center">
                <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 3a3 3 0 110 6 3 3 0 010-6zm0 14.2a7.2 7.2 0 01-6-3.22c.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08A7.2 7.2 0 0112 19.2z"/>
                </svg>
              </div>
              <span class="font-black text-gray-900">WorkPlace <span class="font-medium text-gray-500">Manager</span></span>
            </div>
            <p class="text-sm text-gray-400 max-w-xs">
              La plataforma de gestión más completa para restaurantes modernos.
            </p>
          </div>

          <!-- Links -->
          <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-500">
            <a href="#features" class="hover:text-gray-900 transition-colors duration-150">Funciones</a>
            <a href="#how" class="hover:text-gray-900 transition-colors duration-150">Cómo funciona</a>
            <NuxtLink to="/privacidad" class="hover:text-gray-900 transition-colors duration-150">Privacidad</NuxtLink>
            <NuxtLink to="/terminos" class="hover:text-gray-900 transition-colors duration-150">Términos</NuxtLink>
            <NuxtLink to="/soporte" class="hover:text-gray-900 transition-colors duration-150">Soporte</NuxtLink>
          </div>
        </div>

        <div class="mt-8 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
          © {{ currentYear }} WorkPlace Manager. Todos los derechos reservados.
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ShoppingCartIcon,
  CubeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  UsersIcon,
  TruckIcon,
  ArrowRightIcon,
  CheckIcon,
  PlayIcon,
  ArrowTrendingUpIcon,
  UserPlusIcon,
  CogIcon,
  RocketLaunchIcon,
  StarIcon,
} from '@heroicons/vue/24/outline'

definePageMeta({ layout: false })

const currentYear = computed(() => new Date().getFullYear())

// ─── Hero mock data ──────────────────────────────────────────────────────────

const heroKpis = [
  { label: 'Ventas hoy', value: '$4.2k', trend: 12 },
  { label: 'Pedidos', value: '38', trend: 8 },
  { label: 'Clientes', value: '124', trend: -3 },
]

const chartBars = [45, 62, 55, 78, 70, 88, 100]

const heroOrders = [
  { id: 1, initials: 'JG', name: 'Juan García', time: 'hace 2 min', amount: '$320', status: 'Nuevo', statusClass: 'bg-blue-50 text-blue-600' },
  { id: 2, initials: 'ML', name: 'María López', time: 'hace 8 min', amount: '$185', status: 'Preparando', statusClass: 'bg-yellow-50 text-yellow-600' },
  { id: 3, initials: 'CR', name: 'Carlos R.', time: 'hace 15 min', amount: '$560', status: 'Listo', statusClass: 'bg-green-50 text-green-600' },
]

// ─── Social proof ────────────────────────────────────────────────────────────

const socialStats = [
  { value: '500+', label: 'Restaurantes activos' },
  { value: '99.9%', label: 'Tiempo en línea' },
  { value: '50k+', label: 'Pedidos procesados' },
  { value: '4.9★', label: 'Valoración promedio' },
  { value: '24/7', label: 'Soporte disponible' },
]

// ─── Features ────────────────────────────────────────────────────────────────

const features = [
  {
    title: 'Gestión de Pedidos',
    description: 'Recibe y gestiona todos tus pedidos en tiempo real. Controla estados, tiempos y asignaciones desde un solo panel.',
    icon: ShoppingCartIcon,
    bg: 'bg-blue-500',
  },
  {
    title: 'Control de Inventario',
    description: 'Monitorea tu stock al instante. Recibe alertas automáticas de bajo inventario y evita pérdidas operativas.',
    icon: CubeIcon,
    bg: 'bg-violet-500',
  },
  {
    title: 'Menú Digital',
    description: 'Crea y actualiza tu menú con fotos, precios, categorías y disponibilidad en tiempo real.',
    icon: DocumentTextIcon,
    bg: 'bg-green-500',
  },
  {
    title: 'Analytics y Reportes',
    description: 'Visualiza el rendimiento de tu negocio con gráficas, KPIs e informes exportables.',
    icon: ChartBarIcon,
    bg: 'bg-amber-500',
  },
  {
    title: 'CRM de Clientes',
    description: 'Conoce a tus clientes: historial de pedidos, segmentos, frecuencia y valor de vida.',
    icon: UsersIcon,
    bg: 'bg-pink-500',
  },
  {
    title: 'Control de Delivery',
    description: 'Administra repartidores, rutas y tiempos de entrega. Asigna pedidos y haz seguimiento en vivo.',
    icon: TruckIcon,
    bg: 'bg-teal-500',
  },
]

// ─── How it works ─────────────────────────────────────────────────────────────

const steps = [
  {
    icon: UserPlusIcon,
    title: 'Crea tu cuenta',
    desc: 'Regístrate gratis en menos de 2 minutos. Solo necesitas tu correo y el nombre de tu restaurante.',
  },
  {
    icon: CogIcon,
    title: 'Configura tu negocio',
    desc: 'Agrega tu menú, productos y ajusta la configuración según tus necesidades operativas.',
  },
  {
    icon: RocketLaunchIcon,
    title: 'Comienza a gestionar',
    desc: 'Recibe pedidos, controla inventario y analiza el rendimiento de tu restaurante en tiempo real.',
  },
]

// ─── Testimonials ─────────────────────────────────────────────────────────────

const testimonials = [
  {
    quote: 'Desde que usamos WorkPlace Manager nuestros tiempos de servicio mejoraron un 40%. El módulo de pedidos es increíblemente intuitivo.',
    name: 'Laura Martínez',
    role: 'Dueña, Restaurante El Sabor',
    initials: 'LM',
    avatarBg: 'bg-workplace-red',
  },
  {
    quote: 'El control de inventario nos ahorró miles al mes. Ahora nunca nos quedamos sin ingredientes clave en hora pico.',
    name: 'Roberto Núñez',
    role: 'Chef ejecutivo, Casa del Chef',
    initials: 'RN',
    avatarBg: 'bg-violet-500',
  },
  {
    quote: 'Los reportes de analytics nos ayudaron a identificar nuestros productos estrella y duplicar su disponibilidad.',
    name: 'Ana Torres',
    role: 'Gerente, Pizzería Bella Napoli',
    initials: 'AT',
    avatarBg: 'bg-teal-500',
  },
]
</script>
