<template>
  <div>
    <!-- Filtros por rol/audiencia y categoría de negocio -->
    <div class="card px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
      <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filtrar:</span>
      <div class="flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1 gap-1">
        <button
          v-for="opt in roleFilterOptions" :key="opt.key"
          class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          :class="roleFilter === opt.key ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'"
          @click="$emit('update:role-filter', opt.key)"
        >{{ opt.label }}</button>
      </div>
      <select :value="categoryFilter" class="input-field w-auto text-xs" @change="$emit('update:category-filter', ($event.target as HTMLSelectElement).value)">
        <option value="all">Todas las categorías</option>
        <option v-for="cat in userCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <span class="ml-auto text-xs text-gray-400">{{ filteredPlans.length }} de {{ plans.length }} planes</span>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div v-for="i in 4" :key="i" class="card p-5 animate-pulse space-y-3">
        <div class="skeleton h-5 w-32 rounded" /><div class="skeleton h-8 w-20 rounded" />
        <div class="skeleton h-3 w-full rounded" /><div class="skeleton h-3 w-3/4 rounded" />
      </div>
    </div>

    <!-- Vacío -->
    <div v-else-if="filteredPlans.length === 0" class="card p-12 text-center">
      <CreditCardIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No hay planes que coincidan con los filtros</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="plan in filteredPlans" :key="plan.id"
        class="card border-2 overflow-hidden transition-shadow hover:shadow-md"
        :style="{ borderColor: plan.status === 'ACTIVE' ? plan.color : '#e5e7eb' }"
      >
        <!-- Cabecera -->
        <div class="p-5" :style="{ backgroundColor: plan.color + '12' }">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap mb-0.5">
                <span class="text-base font-bold text-gray-900">{{ plan.name }}</span>
                <span v-if="plan.isPopular" class="badge bg-yellow-100 text-yellow-700">Popular</span>
                <span class="badge" :class="plan.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'">
                  {{ plan.status === 'ACTIVE' ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
              <p class="text-xs text-gray-500">{{ plan.description }}</p>
            </div>
            <div class="flex gap-1 flex-shrink-0">
              <button class="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-700" @click="$emit('edit', plan)">
                <PencilIcon class="h-4 w-4" />
              </button>
              <button class="p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-red-600" @click="$emit('delete', plan)">
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Precio -->
          <div class="mt-3 flex items-baseline gap-1">
            <span class="text-3xl font-black" :style="{ color: plan.color }">{{ formatPrice(plan.price) }}</span>
            <span class="text-gray-400 text-sm">/mes</span>
            <span v-if="plan.priceAnnual" class="ml-1 text-xs text-gray-400">({{ formatPrice(plan.priceAnnual) }}/año)</span>
          </div>

          <!-- Para quién -->
          <div class="flex gap-1.5 mt-2 flex-wrap">
            <span v-if="plan.forCommerce"    class="badge bg-blue-100 text-blue-700">Commerce</span>
            <span v-if="plan.forFreelancer"  class="badge bg-green-100 text-green-700">Freelancer</span>
            <span v-if="plan.forNormal"      class="badge bg-purple-100 text-purple-700">Normal</span>
          </div>

          <!-- Categorías de negocio -->
          <div v-if="(plan.categoryIds ?? []).length > 0" class="flex gap-1.5 mt-1.5 flex-wrap">
            <span
              v-for="catId in plan.categoryIds" :key="catId"
              class="badge bg-white/70 text-gray-600 border border-gray-200 text-[10px]"
            >{{ categoryName(catId) }}</span>
          </div>
          <div v-else class="mt-1.5 text-[10px] text-gray-400 italic">Todas las categorías</div>
        </div>

        <!-- Límites en grid 2×2 -->
        <div class="px-5 py-3 border-t border-gray-100 grid grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-gray-600">
          <span>📦 {{ formatLimit(plan.maxProducts) }} productos</span>
          <span>👥 {{ formatLimit(plan.maxEmployees) }} empleados</span>
          <span>🏢 {{ formatLimit(plan.maxBranches) }} sucursales</span>
          <span>📋 {{ formatLimit(plan.maxOrders) }} pedidos/mes</span>
        </div>

        <!-- Módulos -->
        <div class="px-5 pb-4">
          <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Módulos</p>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="mod in (plan.enabledModules ?? [])" :key="mod"
              class="badge bg-gray-100 text-gray-600 text-[10px]"
            >{{ moduleLabels[mod] ?? mod }}</span>
            <span v-if="!plan.enabledModules?.length" class="text-xs text-gray-300 italic">Sin módulos</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span class="text-xs text-gray-400">{{ plan._count?.subscriptions ?? 0 }} suscripciones</span>
          <button class="text-xs text-red-600 hover:text-red-800 font-medium" @click="$emit('assign', plan)">
            Asignar →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CreditCardIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { Plan } from '~/composables/commerce/usePlans'

interface UserCategory { id: string; name: string; icon?: string }

const props = defineProps<{
  plans: Plan[]
  loading: boolean
  roleFilter: 'all' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'
  categoryFilter: string
  userCategories: UserCategory[]
  moduleLabels: Record<string, string>
  formatPrice: (n: number) => string
  formatLimit: (n: number) => string
}>()

defineEmits<{
  'update:role-filter': [value: 'all' | 'COMMERCE' | 'FREELANCER' | 'NORMAL']
  'update:category-filter': [value: string]
  edit: [plan: Plan]
  delete: [plan: Plan]
  assign: [plan: Plan]
}>()

const roleFilterOptions: { key: 'all' | 'COMMERCE' | 'FREELANCER' | 'NORMAL'; label: string }[] = [
  { key: 'all',         label: 'Todos' },
  { key: 'COMMERCE',    label: 'Commerce' },
  { key: 'FREELANCER',  label: 'Freelancer' },
  { key: 'NORMAL',      label: 'Normal' },
]

const filteredPlans = computed(() => {
  return props.plans.filter((plan) => {
    if (props.roleFilter === 'COMMERCE' && !plan.forCommerce) return false
    if (props.roleFilter === 'FREELANCER' && !plan.forFreelancer) return false
    if (props.roleFilter === 'NORMAL' && !plan.forNormal) return false

    if (props.categoryFilter !== 'all') {
      const ids = plan.categoryIds ?? []
      if (ids.length > 0 && !ids.includes(props.categoryFilter)) return false
    }

    return true
  })
})

function categoryName(id: string): string {
  return props.userCategories.find(c => c.id === id)?.name ?? id
}
</script>
