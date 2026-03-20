<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">

    <!-- Hero -->
    <div class="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white py-20 px-6 text-center">
      <div class="max-w-3xl mx-auto">
        <span class="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4 backdrop-blur-sm">
          Planes y Precios
        </span>
        <h1 class="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
          Elige el plan perfecto<br class="hidden sm:block" /> para tu negocio
        </h1>
        <p class="text-red-100 text-lg mb-8 max-w-xl mx-auto">
          Empieza gratis y escala cuando lo necesites. Sin contratos, cancela cuando quieras.
        </p>

        <!-- Billing toggle -->
        <div class="inline-flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl p-1.5">
          <button
            :class="[
              'px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
              !annual ? 'bg-white text-red-600 shadow-sm' : 'text-white/80 hover:text-white',
            ]"
            @click="annual = false"
          >
            Mensual
          </button>
          <button
            :class="[
              'px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200',
              annual ? 'bg-white text-red-600 shadow-sm' : 'text-white/80 hover:text-white',
            ]"
            @click="annual = true"
          >
            Anual
            <span class="ml-1.5 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">-20%</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="max-w-5xl mx-auto mt-6 px-6">
      <div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
        <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm">{{ error }}</span>
      </div>
    </div>

    <!-- Plans grid -->
    <div class="max-w-6xl mx-auto px-6 py-16">

      <!-- Loading skeleton -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="i in 3" :key="i" class="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse shadow-sm">
          <div class="h-5 bg-gray-200 rounded w-1/2 mb-3" />
          <div class="h-9 bg-gray-200 rounded w-1/3 mb-2" />
          <div class="h-4 bg-gray-100 rounded w-3/4 mb-6" />
          <div class="space-y-2">
            <div class="h-3 bg-gray-100 rounded w-full" />
            <div class="h-3 bg-gray-100 rounded w-4/5" />
            <div class="h-3 bg-gray-100 rounded w-full" />
            <div class="h-3 bg-gray-100 rounded w-3/4" />
          </div>
          <div class="h-10 bg-gray-200 rounded-xl mt-6" />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="plans.length === 0" class="text-center py-16 text-gray-400">
        <svg class="w-14 h-14 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <p class="text-lg font-medium">No hay planes disponibles en este momento</p>
        <p class="text-sm mt-1">Vuelve pronto o contáctanos para más información.</p>
      </div>

      <!-- Plan cards -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="plan in plans"
          :key="plan.id"
          :class="[
            'relative bg-white rounded-2xl border-2 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 flex flex-col overflow-hidden',
            plan.isPopular ? 'border-red-500 shadow-red-100' : 'border-gray-200',
          ]"
        >
          <!-- Popular badge -->
          <div v-if="plan.isPopular" class="bg-gradient-to-r from-red-500 to-rose-500 text-white text-xs font-bold text-center py-1.5 tracking-wide uppercase">
            Más Popular
          </div>

          <!-- Card header -->
          <div class="p-6 pb-4">
            <div class="flex items-start justify-between mb-3">
              <div>
                <h3 class="text-xl font-bold text-gray-900">{{ plan.name }}</h3>
                <p class="text-sm text-gray-500 mt-0.5">{{ plan.description }}</p>
              </div>
              <div v-if="plan.color" class="w-4 h-4 rounded-full flex-shrink-0 mt-1" :style="{ backgroundColor: plan.color }" />
            </div>

            <!-- Price -->
            <div class="mt-4">
              <template v-if="currentPrice(plan) === 0">
                <span class="text-4xl font-extrabold text-gray-900">Gratis</span>
              </template>
              <template v-else>
                <span class="text-4xl font-extrabold text-gray-900">{{ formatPrice(currentPrice(plan)) }}</span>
                <span class="text-gray-400 text-sm ml-1">/ {{ annual ? 'año' : 'mes' }}</span>
              </template>
              <p v-if="annual && plan.priceAnnual && plan.priceMonthly" class="text-xs text-green-600 font-medium mt-1">
                Ahorras {{ formatPrice((plan.priceMonthly * 12) - plan.priceAnnual) }} al año
              </p>
            </div>
          </div>

          <!-- Features -->
          <div class="px-6 pb-6 flex-1">
            <ul class="space-y-2.5 mb-6">
              <li v-for="(feature, fi) in plan.features" :key="fi" class="flex items-start gap-2.5">
                <svg class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span class="text-sm text-gray-700">{{ feature }}</span>
              </li>
            </ul>

            <!-- Limits snippet -->
            <div class="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 space-y-1 mb-6">
              <div class="flex justify-between">
                <span>Productos</span>
                <span class="font-medium text-gray-700">{{ formatLimit(plan.maxProducts) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Empleados</span>
                <span class="font-medium text-gray-700">{{ formatLimit(plan.maxEmployees) }}</span>
              </div>
              <div class="flex justify-between">
                <span>Sucursales</span>
                <span class="font-medium text-gray-700">{{ formatLimit(plan.maxBranches) }}</span>
              </div>
            </div>

            <!-- CTA button -->
            <NuxtLink
              :to="currentPrice(plan) === 0 ? '/register' : '/register'"
              :class="[
                'block w-full text-center px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200',
                plan.isPopular
                  ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 shadow-sm hover:shadow-red-200 hover:shadow-md'
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
              ]"
            >
              {{ currentPrice(plan) === 0 ? 'Empezar gratis' : 'Contratar' }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer CTA -->
    <div class="border-t border-gray-200 bg-white py-12 px-6 text-center">
      <h3 class="text-xl font-bold text-gray-900 mb-2">¿Tienes preguntas?</h3>
      <p class="text-gray-500 mb-4">Nuestro equipo está listo para ayudarte a elegir el plan ideal.</p>
      <a
        href="mailto:soporte@workplacemanager.com"
        class="inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-rose-500 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:from-red-600 hover:to-rose-600 transition-all shadow-sm hover:shadow-md"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        Contáctanos
      </a>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Public page — no auth required
definePageMeta({})

const config = useRuntimeConfig()

interface Plan {
  id: string
  name: string
  description: string
  priceMonthly: number
  priceAnnual?: number
  color?: string
  isPopular?: boolean
  features: string[]
  maxProducts?: number | null
  maxEmployees?: number | null
  maxBranches?: number | null
}

const plans = ref<Plan[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const annual = ref(false)

async function loadPlans() {
  loading.value = true
  try {
    const res = await fetch(`${config.public.apiUrl}/plans/public`)
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`)
    const data = await res.json()
    plans.value = Array.isArray(data) ? data : (data.data ?? [])
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function currentPrice(plan: Plan): number {
  if (annual.value && plan.priceAnnual) return plan.priceAnnual
  return plan.priceMonthly ?? 0
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(amount)
}

function formatLimit(value: number | null | undefined): string {
  if (value === null || value === undefined || value < 0) return 'Ilimitado'
  return value.toLocaleString('es-MX')
}

onMounted(loadPlans)
</script>
