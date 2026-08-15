<template>
  <section class="mt-8">
    <h2 class="text-xl font-black text-gray-900 mb-4">Comparativa de planes</h2>
    <div class="card overflow-x-auto p-0">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 bg-gray-50">
            <th class="text-left px-5 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider w-2/5">Característica</th>
            <th
              v-for="plan in plans.slice(0, 4)"
              :key="plan.id"
              class="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider"
              :class="plan.isPopular ? 'text-red-600' : 'text-gray-500'"
            >
              {{ plan.name }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="row in compareRows" :key="row.label" class="hover:bg-gray-50 transition-colors">
            <td class="px-5 py-3.5 text-gray-700 font-medium">{{ row.label }}</td>
            <td v-for="plan in plans.slice(0, 4)" :key="plan.id" class="px-4 py-3.5 text-center">
              <span class="font-semibold text-gray-900">{{ row.getValue(plan) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMoneyFormat } from '~/composables/core/useMoneyFormat'
import type { PricingPlan } from './UpgradeWizard.vue'

const props = defineProps<{
  plans: PricingPlan[]
}>()

const { formatPrice, formatLimit: formatLimitBase } = useMoneyFormat()
function formatLimit(value: number | null | undefined): string {
  return formatLimitBase(value, '∞')
}

function currentPrice(plan: PricingPlan): number {
  return plan.priceMonthly ?? plan.price ?? 0
}

const compareRows = computed(() => [
  { label: 'Precio mensual',  getValue: (p: PricingPlan) => currentPrice(p) === 0 ? 'Gratis' : formatPrice(p.priceMonthly ?? 0) },
  { label: 'Precio anual',    getValue: (p: PricingPlan) => p.priceAnnual ? formatPrice(p.priceAnnual) : '—' },
  { label: 'Productos',       getValue: (p: PricingPlan) => formatLimit(p.maxProducts) },
  { label: 'Empleados',       getValue: (p: PricingPlan) => formatLimit(p.maxEmployees) },
  { label: 'Sucursales',      getValue: (p: PricingPlan) => formatLimit(p.maxBranches) },
  { label: 'Pedidos / mes',   getValue: (p: PricingPlan) => formatLimit(p.maxOrders) },
])
</script>
