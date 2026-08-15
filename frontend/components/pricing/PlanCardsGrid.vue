<template>
  <section>
    <div v-if="error" class="mb-8 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
      <ExclamationCircleIcon class="w-5 h-5 text-red-500 flex-shrink-0" />
      <span class="text-sm text-red-700">{{ error }}</span>
    </div>

    <p v-if="changePlanError" class="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-sm text-red-700">
      <ExclamationCircleIcon class="w-5 h-5 text-red-500 flex-shrink-0" />
      {{ changePlanError }}
    </p>

    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 3" :key="i" class="card p-6 animate-pulse space-y-4">
        <div class="skeleton h-5 w-32 rounded" />
        <div class="skeleton h-10 w-24 rounded" />
        <div class="skeleton h-3 w-48 rounded" />
        <div class="space-y-2 pt-2">
          <div v-for="n in 4" :key="n" class="skeleton h-3 rounded" :class="n % 2 === 0 ? 'w-4/5' : 'w-full'" />
        </div>
        <div class="skeleton h-11 rounded-xl mt-2" />
      </div>
    </div>

    <div v-else-if="plans.length === 0" class="card text-center py-20 text-gray-400">
      <CreditCardIcon class="w-14 h-14 mx-auto mb-4 opacity-30" />
      <p class="text-lg font-medium">No hay planes disponibles en este momento</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="relative flex flex-col card border-2 transition-all duration-200 hover:shadow-xl hover:-translate-y-1 overflow-hidden"
        :class="myPlanId === plan.id ? '' : (plan.isPopular ? 'border-red-500 shadow-red-100/60' : 'border-gray-200')"
        :style="myPlanId === plan.id ? { borderColor: plan.color || '#ef4444' } : {}"
      >
        <!-- Banner popular / plan actual -->
        <div v-if="myPlanId === plan.id" class="bg-gradient-to-r from-red-600 to-rose-500 text-white text-xs font-black text-center py-2 tracking-widest uppercase">
          ✓ Tu Plan Actual
        </div>
        <div v-else-if="plan.isPopular" class="bg-gradient-to-r from-red-600 to-rose-500 text-white text-xs font-black text-center py-2 tracking-widest uppercase">
          ★ Más Popular
        </div>

        <!-- Cabecera -->
        <div class="p-6 pb-4" :class="plan.isPopular || myPlanId === plan.id ? 'bg-red-50/50' : 'bg-white'">
          <div class="flex items-start justify-between mb-4">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span v-if="plan.color" class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: plan.color }" />
                <h3 class="text-lg font-black text-gray-900">{{ plan.name }}</h3>
              </div>
              <p class="text-sm text-gray-500 leading-snug">{{ plan.description }}</p>
            </div>
          </div>

          <!-- Precio -->
          <div class="mt-2">
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-black text-gray-900">
                {{ currentPrice(plan) === 0 ? 'Gratis' : formatPrice(currentPrice(plan)) }}
              </span>
              <span v-if="currentPrice(plan) > 0" class="text-gray-400 text-sm">/ {{ annual ? 'año' : 'mes' }}</span>
            </div>
            <p v-if="annual && plan.priceAnnual && plan.priceMonthly" class="text-xs text-green-600 font-semibold mt-1 flex items-center gap-1">
              <CheckIcon class="w-3 h-3" />
              Ahorras {{ formatPrice((plan.priceMonthly * 12) - plan.priceAnnual) }} al año
            </p>
          </div>
        </div>

        <!-- Cuerpo -->
        <div class="px-6 pb-6 flex-1 flex flex-col">
          <!-- Límites -->
          <div class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-5 py-4 border-y border-gray-100">
            <div class="flex items-center gap-1.5 text-gray-600">
              <span class="text-base">📦</span>
              <span>{{ formatLimit(plan.maxProducts) }} productos</span>
            </div>
            <div class="flex items-center gap-1.5 text-gray-600">
              <span class="text-base">👥</span>
              <span>{{ formatLimit(plan.maxEmployees) }} empleados</span>
            </div>
            <div class="flex items-center gap-1.5 text-gray-600">
              <span class="text-base">🏢</span>
              <span>{{ formatLimit(plan.maxBranches) }} sucursales</span>
            </div>
            <div class="flex items-center gap-1.5 text-gray-600">
              <span class="text-base">📋</span>
              <span>{{ formatLimit(plan.maxOrders ?? null) }} pedidos</span>
            </div>
          </div>

          <!-- Features -->
          <ul class="space-y-2 mb-6 flex-1">
            <li v-for="(feat, fi) in plan.features" :key="fi" class="flex items-start gap-2.5">
              <CheckIcon class="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span class="text-sm text-gray-700 leading-snug">{{ feat }}</span>
            </li>
          </ul>

          <!-- CTA -->
          <div v-if="myPlanId === plan.id" class="w-full text-center px-6 py-3 rounded-xl font-bold text-sm bg-gray-100 text-gray-500">
            Plan actual ✓
          </div>
          <button
            v-else-if="canChangePlan"
            type="button"
            :disabled="changingPlan === plan.id"
            class="w-full text-center px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
            :class="plan.isPopular
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'"
            @click="$emit('change-plan', plan)"
          >
            <span v-if="changingPlan === plan.id" class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {{ changingPlan === plan.id ? 'Procesando...' : 'Cambiar a este plan' }}
          </button>
          <NuxtLink
            v-else
            :to="isAuthenticated ? '/my-plan' : '/register'"
            class="block w-full text-center px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200"
            :class="plan.isPopular
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-sm shadow-red-200'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800'"
          >
            {{ isAuthenticated ? 'Ver mi plan' : (currentPrice(plan) === 0 ? 'Empezar gratis' : 'Contratar') }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { CreditCardIcon, CheckIcon, ExclamationCircleIcon } from '@heroicons/vue/24/outline'
import { useMoneyFormat } from '~/composables/core/useMoneyFormat'
import type { PricingPlan } from './UpgradeWizard.vue'

const props = defineProps<{
  plans: PricingPlan[]
  loading: boolean
  error: string | null
  changePlanError: string
  annual: boolean
  myPlanId: string | undefined
  canChangePlan: boolean
  isAuthenticated: boolean
  changingPlan: string | null
}>()

defineEmits<{
  'change-plan': [plan: PricingPlan]
}>()

const { formatPrice, formatLimit: formatLimitBase } = useMoneyFormat()
function formatLimit(value: number | null | undefined): string {
  return formatLimitBase(value, '∞')
}

function currentPrice(plan: PricingPlan): number {
  if (props.annual && plan.priceAnnual) return plan.priceAnnual
  return plan.priceMonthly ?? plan.price ?? 0
}
</script>
