<template>
  <div class="min-h-screen bg-white font-sans">

    <!-- ─── Navbar ─────────────────────────────────────────────────────────── -->
    <nav class="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <!-- Logo -->
        <AppLogo />

        <!-- Desktop nav -->
        <div class="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <a href="#features" aria-label="Ver funcionalidades" class="hover:text-gray-900 transition-colors duration-150">Funciones</a>
          <a href="#how" aria-label="Cómo funciona la plataforma" class="hover:text-gray-900 transition-colors duration-150">Cómo funciona</a>
          <a href="#testimonials" aria-label="Testimonios de clientes" class="hover:text-gray-900 transition-colors duration-150">Testimonios</a>
          <NuxtLink to="/precios" class="hover:text-gray-900 transition-colors duration-150">Precios</NuxtLink>
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
              <button
                type="button"
                aria-label="Ver demo de la plataforma"
                class="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 font-semibold px-7 py-3.5 rounded-xl shadow-sm hover:shadow-md transition-all duration-150 text-base"
                @click="showDemo = true"
              >
                <PlayIcon class="w-4 h-4 text-workplace-red" />
                Ver demo
              </button>
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
                <p class="text-xs text-gray-400 font-medium mb-3">Pedidos recientes <span class="text-[10px] text-gray-300 font-normal">(demo)</span></p>
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
        <!-- Skeleton while loading -->
        <template v-if="loadingContent">
          <div v-for="n in 5" :key="n" class="text-center space-y-1.5">
            <div class="h-7 w-16 bg-gray-200 rounded-md animate-pulse mx-auto"></div>
            <div class="h-3 w-20 bg-gray-100 rounded animate-pulse mx-auto"></div>
          </div>
        </template>
        <template v-else>
          <div v-for="stat in socialStats" :key="stat.label" class="text-center">
            <p class="text-2xl font-black text-gray-900">{{ stat.value }}</p>
            <p class="text-xs text-gray-500 font-medium mt-0.5">{{ stat.label }}</p>
          </div>
        </template>
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
          <!-- Connecting line (desktop): spans between centers of the 3 icon boxes -->
          <div class="hidden md:block absolute top-10 h-px bg-gray-200" style="left: calc(16.67% + 40px); right: calc(16.67% + 40px);"></div>

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

        <!-- Skeleton while loading -->
        <div v-if="loadingContent" class="grid md:grid-cols-3 gap-6">
          <div v-for="n in 3" :key="n" class="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-4 animate-pulse">
            <div class="flex gap-1">
              <div v-for="s in 5" :key="s" class="w-4 h-4 bg-gray-200 rounded"></div>
            </div>
            <div class="space-y-2">
              <div class="h-3 bg-gray-100 rounded w-full"></div>
              <div class="h-3 bg-gray-100 rounded w-4/5"></div>
              <div class="h-3 bg-gray-100 rounded w-3/5"></div>
            </div>
            <div class="flex items-center gap-3 pt-2 border-t border-gray-50">
              <div class="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0"></div>
              <div class="space-y-1.5">
                <div class="h-3 bg-gray-200 rounded w-24"></div>
                <div class="h-2.5 bg-gray-100 rounded w-32"></div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="grid md:grid-cols-3 gap-6">
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
              <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" :style="{ backgroundColor: t.avatarColor }">
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
              Únete a {{ restaurantCountLabel }} restaurantes que ya gestionan su negocio con WorkPlace Manager.
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
            <AppLogo size="sm" />
            <p class="text-sm text-gray-400 max-w-xs">
              La plataforma de gestión más completa para restaurantes modernos.
            </p>
          </div>

          <!-- Links -->
          <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-500">
            <a href="#features" aria-label="Ver funcionalidades" class="hover:text-gray-900 transition-colors duration-150">Funciones</a>
            <a href="#how" aria-label="Cómo funciona la plataforma" class="hover:text-gray-900 transition-colors duration-150">Cómo funciona</a>
            <NuxtLink to="/precios" class="hover:text-gray-900 transition-colors duration-150">Precios</NuxtLink>
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

    <!-- ─── Demo Modal ─────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showDemo"
          class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Demo de WorkPlace Manager"
          @click.self="showDemo = false"
        >
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <!-- Modal header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 class="font-bold text-gray-900">Demo interactiva</h3>
                <p class="text-xs text-gray-400 mt-0.5">Explora la plataforma antes de registrarte</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar demo"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                @click="showDemo = false"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>

            <!-- Modal body -->
            <div class="p-6 space-y-5">
              <!-- Preview image placeholder -->
              <div class="w-full aspect-video bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 flex flex-col items-center justify-center gap-3">
                <div class="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
                  <PlayIcon class="w-7 h-7 text-workplace-red" />
                </div>
                <p class="text-sm font-semibold text-gray-700">Video demo próximamente</p>
                <p class="text-xs text-gray-400 text-center max-w-xs">Mientras tanto, crea tu cuenta gratis y explora la plataforma completa.</p>
              </div>

              <!-- Feature highlights -->
              <div class="grid grid-cols-2 gap-3">
                <div v-for="feat in demoHighlights" :key="feat.label" class="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div :class="['w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', feat.bg]">
                    <component :is="feat.icon" class="w-3.5 h-3.5 text-white" />
                  </div>
                  <span class="text-xs font-semibold text-gray-700">{{ feat.label }}</span>
                </div>
              </div>
            </div>

            <!-- Modal footer -->
            <div class="flex flex-col sm:flex-row gap-2.5 px-6 pb-6">
              <NuxtLink
                to="/register"
                class="flex-1 inline-flex items-center justify-center gap-2 bg-workplace-red hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-150 text-sm"
                @click="showDemo = false"
              >
                Crear cuenta gratis
                <ArrowRightIcon class="w-4 h-4" />
              </NuxtLink>
              <button
                type="button"
                class="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-all duration-150 text-sm"
                @click="showDemo = false"
              >
                Seguir explorando
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
  CheckIcon,
  PlayIcon,
  ArrowTrendingUpIcon,
  UserPlusIcon,
  CogIcon,
  RocketLaunchIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { StarIcon } from '@heroicons/vue/24/solid'

definePageMeta({ layout: false })

const config = useRuntimeConfig()
const siteUrl = config.public.siteUrl as string

useHead({
  title: 'WorkPlace Manager — Gestiona tu restaurante sin complicaciones',
  meta: [
    { name: 'description', content: 'Pedidos, inventario, menú, clientes, delivery y reportes todo desde un solo panel. La plataforma todo-en-uno diseñada para restaurantes que quieren crecer.' },
    { name: 'keywords', content: 'gestión restaurante, software restaurante, pedidos online, inventario, delivery, analytics' },
    { property: 'og:site_name', content: 'WorkPlace Manager' },
    { property: 'og:title', content: 'WorkPlace Manager — Gestiona tu restaurante sin complicaciones' },
    { property: 'og:description', content: 'Pedidos, inventario, menú, clientes, delivery y reportes — todo desde un solo panel.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: siteUrl },
    { property: 'og:image', content: `${siteUrl}/og-image.png` },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'WorkPlace Manager' },
    { name: 'twitter:description', content: 'La plataforma todo-en-uno para gestionar tu restaurante.' },
  ],
  link: [{ rel: 'canonical', href: siteUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'WorkPlace Manager',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: 'Plataforma todo-en-uno para la gestión de restaurantes: pedidos, inventario, menú, clientes, delivery y reportes.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Plan gratuito disponible',
        },
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          ratingCount: '500',
        },
      }),
    },
  ],
})

const currentYear = new Date().getFullYear()
const showDemo = ref(false)

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

// ─── Demo modal highlights ────────────────────────────────────────────────────

const demoHighlights = [
  { label: 'Gestión de pedidos', icon: ShoppingCartIcon, bg: 'bg-blue-500' },
  { label: 'Control de inventario', icon: CubeIcon, bg: 'bg-violet-500' },
  { label: 'Analytics en tiempo real', icon: ChartBarIcon, bg: 'bg-amber-500' },
  { label: 'CRM de clientes', icon: UsersIcon, bg: 'bg-pink-500' },
]

// ─── Dynamic landing content ──────────────────────────────────────────────────

const { stats: socialStats, testimonials, loading: loadingContent, load: loadLandingContent } = useLandingContent()
onMounted(loadLandingContent)

// CTA banner usa el primer stat de restaurantes (o fallback)
const restaurantCountLabel = computed(() => {
  const restaurantStat = socialStats.value.find(s =>
    s.label.toLowerCase().includes('restaurante')
  )
  return restaurantStat ? `más de ${restaurantStat.value}` : 'más de 500'
})

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
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
