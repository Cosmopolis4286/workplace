<template>
  <div v-if="usage && showAny" class="bg-white border border-gray-200 rounded-xl p-4 mb-4">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2">
        <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <span class="text-sm font-semibold text-gray-700">Plan {{ usage.limits.planName }}</span>
      </div>
      <NuxtLink to="/my-plan" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium">Ver plan →</NuxtLink>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <template v-for="item in visibleItems" :key="item.label">
        <div>
          <div class="flex justify-between text-xs text-gray-500 mb-1">
            <span>{{ item.label }}</span>
            <span :class="item.pct >= 90 ? 'text-red-600 font-semibold' : item.pct >= 70 ? 'text-yellow-600 font-semibold' : 'text-gray-500'">
              {{ item.used }} / {{ item.max === -1 ? '∞' : item.max }}
            </span>
          </div>
          <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all"
              :class="item.pct >= 90 ? 'bg-red-500' : item.pct >= 70 ? 'bg-yellow-400' : 'bg-indigo-500'"
              :style="{ width: `${Math.min(item.pct, 100)}%` }"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Warning when at limit -->
    <div v-if="atLimit.length > 0" class="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
      <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      Límite alcanzado: <strong>{{ atLimit.join(', ') }}</strong>.
      <NuxtLink to="/my-plan" class="underline hover:no-underline">Actualiza tu plan</NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PlanUsage } from '~/composables/commerce/usePlans'

const props = defineProps<{
  usage: PlanUsage | null
  show?: ('products' | 'employees' | 'branches' | 'orders')[]
}>()

const allItems = computed(() => {
  if (!props.usage) return []
  const { limits, usage } = props.usage
  return [
    { key: 'products',  label: 'Productos',   used: usage.products,         max: limits.maxProducts,  pct: limits.maxProducts  === -1 ? 0 : Math.round((usage.products / limits.maxProducts) * 100) },
    { key: 'employees', label: 'Empleados',    used: usage.employees,        max: limits.maxEmployees, pct: limits.maxEmployees === -1 ? 0 : Math.round((usage.employees / limits.maxEmployees) * 100) },
    { key: 'branches',  label: 'Sucursales',   used: usage.branches,         max: limits.maxBranches,  pct: limits.maxBranches  === -1 ? 0 : Math.round((usage.branches / limits.maxBranches) * 100) },
    { key: 'orders',    label: 'Pedidos/mes',  used: usage.ordersThisMonth,  max: limits.maxOrders,    pct: limits.maxOrders    === -1 ? 0 : Math.round((usage.ordersThisMonth / limits.maxOrders) * 100) },
  ]
})

const visibleItems = computed(() => {
  const show = props.show
  if (!show) return allItems.value.filter(i => i.max !== -1 && i.max !== 0)
  return allItems.value.filter(i => show.includes(i.key as any) && i.max !== -1 && i.max !== 0)
})

const showAny = computed(() => visibleItems.value.length > 0)
const atLimit = computed(() => visibleItems.value.filter(i => i.pct >= 100).map(i => i.label))
</script>
