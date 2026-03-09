<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <div class="bg-white border-b border-gray-200 px-6 py-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Mi Plan</h1>
        <p class="text-sm text-gray-500 mt-0.5">Gestiona tu suscripción y conoce los planes disponibles</p>
      </div>
    </div>

    <div class="p-6 space-y-8">
      <!-- Current subscription -->
      <div v-if="loading" class="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
        <div class="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div class="h-10 bg-gray-100 rounded w-1/4"></div>
      </div>

      <div v-else-if="mySubscription && myPlan" class="bg-white rounded-2xl border-2 overflow-hidden" :style="{ borderColor: myPlan.color }">
        <div class="p-6" :style="{ background: `linear-gradient(135deg, ${myPlan.color}20, ${myPlan.color}05)` }">
          <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p class="text-sm text-gray-500 mb-1">Tu plan actual</p>
              <div class="flex items-center gap-3">
                <h2 class="text-3xl font-bold text-gray-900">{{ myPlan.name }}</h2>
                <span
                  :class="SUB_STATUS_CLASSES[mySubscription.status]"
                  class="text-xs px-2.5 py-1 rounded-full font-semibold"
                >
                  {{ SUB_STATUS_LABELS[mySubscription.status] }}
                </span>
              </div>
              <p class="text-gray-500 mt-1">{{ myPlan.description }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-4xl font-bold" :style="{ color: myPlan.color }">{{ formatPrice(mySubscription.pricePaid) }}</p>
              <p class="text-sm text-gray-400">/ {{ INTERVAL_LABELS[mySubscription.interval].toLowerCase() }}</p>
            </div>
          </div>

          <!-- Expiry -->
          <div v-if="mySubscription.endAt" class="mt-4 flex items-center gap-2 text-sm">
            <svg class="w-4 h-4" :style="{ color: myPlan.color }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span class="text-gray-600">
              Vence el <strong>{{ new Date(mySubscription.endAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) }}</strong>
              <template v-if="daysRemaining(mySubscription.endAt) !== null">
                <span :class="(daysRemaining(mySubscription.endAt) ?? 0) <= 7 ? 'text-red-600 font-semibold' : 'text-gray-500'">
                  ({{ daysRemaining(mySubscription.endAt) }} días restantes)
                </span>
              </template>
            </span>
          </div>
        </div>

        <!-- Limits & features -->
        <div class="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100">
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900">{{ formatLimit(myPlan.maxProducts) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Productos</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900">{{ formatLimit(myPlan.maxEmployees) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Empleados</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900">{{ formatLimit(myPlan.maxBranches) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Sucursales</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-bold text-gray-900">{{ formatLimit(myPlan.maxOrders) }}</p>
            <p class="text-xs text-gray-500 mt-0.5">Pedidos/mes</p>
          </div>
        </div>

        <div class="px-6 pb-6 flex flex-wrap gap-3">
          <span
            v-for="feat in myPlan.features"
            :key="feat"
            class="text-xs px-3 py-1.5 rounded-full border font-medium text-gray-600 bg-gray-50"
          >
            ✓ {{ feat }}
          </span>
        </div>
      </div>

      <!-- No subscription -->
      <div v-else-if="!loading" class="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-10 text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-gray-900 mb-1">Sin plan activo</h3>
        <p class="text-gray-500 text-sm">No tienes ningún plan activo. Contacta al administrador para adquirir uno.</p>
      </div>

      <!-- Available plans -->
      <div>
        <h2 class="text-xl font-bold text-gray-900 mb-4">Planes disponibles</h2>
        <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div v-for="i in 3" :key="i" class="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-64"></div>
        </div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div
            v-for="plan in plans"
            :key="plan.id"
            class="bg-white rounded-xl border-2 overflow-hidden transition"
            :class="myPlan?.id === plan.id ? 'ring-2' : 'hover:shadow-md'"
            :style="{ borderColor: plan.color, '--tw-ring-color': plan.color }"
          >
            <div class="p-5 relative" :style="{ backgroundColor: plan.color + '12' }">
              <div v-if="myPlan?.id === plan.id" class="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full text-white" :style="{ backgroundColor: plan.color }">
                Tu plan
              </div>
              <div v-if="plan.isPopular && myPlan?.id !== plan.id" class="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                Popular
              </div>
              <h3 class="text-lg font-bold text-gray-900">{{ plan.name }}</h3>
              <p class="text-sm text-gray-500 mt-0.5 min-h-[2.5rem]">{{ plan.description }}</p>
              <div class="mt-3">
                <span class="text-3xl font-bold" :style="{ color: plan.color }">{{ formatPrice(plan.price) }}</span>
                <span class="text-gray-400 text-sm">/mes</span>
                <span v-if="plan.priceAnnual" class="ml-2 text-xs text-gray-400">{{ formatPrice(plan.priceAnnual) }}/año</span>
              </div>
            </div>

            <div class="p-5 space-y-2">
              <div class="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-3">
                <span>📦 {{ formatLimit(plan.maxProducts) }} productos</span>
                <span>👥 {{ formatLimit(plan.maxEmployees) }} empleados</span>
                <span>🏢 {{ formatLimit(plan.maxBranches) }} sucursales</span>
                <span>📋 {{ formatLimit(plan.maxOrders) }} pedidos/mes</span>
              </div>
              <div
                v-for="feat in plan.features.slice(0, 4)"
                :key="feat"
                class="flex items-start gap-2 text-sm text-gray-700"
              >
                <svg class="w-4 h-4 shrink-0 mt-0.5" :style="{ color: plan.color }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ feat }}
              </div>
              <p v-if="plan.features.length > 4" class="text-xs text-gray-400 ml-6">+{{ plan.features.length - 4 }} más</p>
            </div>

            <div class="px-5 pb-5">
              <div
                v-if="myPlan?.id === plan.id"
                class="w-full py-2 text-sm text-center font-medium rounded-lg text-white"
                :style="{ backgroundColor: plan.color }"
              >
                Plan actual ✓
              </div>
              <p v-else class="text-xs text-gray-400 text-center">
                Contacta a soporte para cambiar de plan
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { usePlans, SUB_STATUS_LABELS, SUB_STATUS_CLASSES, INTERVAL_LABELS } from '~/composables/usePlans'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const {
  plans, mySubscription, myPlan, loading,
  fetchMySubscription, fetchPublicPlans,
  formatLimit, formatPrice, daysRemaining,
} = usePlans()

onMounted(async () => {
  await Promise.all([fetchMySubscription(), fetchPublicPlans()])
})
</script>
