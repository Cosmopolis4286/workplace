<template>
  <div class="card overflow-hidden">
    <!-- Filtros -->
    <div class="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
      <select :value="statusFilter" class="input-field w-auto" @change="$emit('update:status-filter', ($event.target as HTMLSelectElement).value)">
        <option value="">Todos los estados</option>
        <option value="ACTIVE">Activo</option>
        <option value="TRIAL">Prueba</option>
        <option value="EXPIRED">Expirado</option>
        <option value="CANCELLED">Cancelado</option>
      </select>
      <select :value="planFilter" class="input-field w-auto" @change="$emit('update:plan-filter', ($event.target as HTMLSelectElement).value)">
        <option value="">Todos los planes</option>
        <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <button class="btn-primary ml-auto text-sm flex items-center gap-2" @click="$emit('assign')">
        <PlusIcon class="h-4 w-4" />Asignar suscripción
      </button>
    </div>

    <!-- Skeleton -->
    <template v-if="loading">
      <div v-for="i in 5" :key="i" class="p-4 flex items-center gap-4 border-b border-gray-100">
        <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
        <div class="flex-1 space-y-2"><div class="skeleton h-4 w-36 rounded" /><div class="skeleton h-3 w-48 rounded" /></div>
        <div class="skeleton h-6 w-16 rounded-full" />
      </div>
    </template>

    <!-- Vacío -->
    <div v-else-if="subscriptions.length === 0" class="p-12 text-center">
      <CreditCardIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-500 font-medium">No hay suscripciones</p>
    </div>

    <!-- Filas -->
    <div v-else class="divide-y divide-gray-100">
      <div v-for="sub in subscriptions" :key="sub.id" class="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
        <!-- Avatar -->
        <div class="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-sm text-red-700 flex-shrink-0">
          {{ sub.user?.firstName?.[0] ?? '?' }}
        </div>
        <!-- Usuario -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">{{ sub.user?.firstName }} {{ sub.user?.lastName }}</p>
          <p class="text-xs text-gray-400 truncate">{{ sub.user?.email }}</p>
        </div>
        <!-- Plan -->
        <span
          class="badge flex-shrink-0"
          :style="{ backgroundColor: (sub.plan?.color ?? '#6b7280') + '20', color: sub.plan?.color ?? '#6b7280' }"
        >{{ sub.plan?.name }}</span>
        <!-- Estado -->
        <span class="badge flex-shrink-0" :class="SUB_STATUS_CLASSES[sub.status]">{{ SUB_STATUS_LABELS[sub.status] }}</span>
        <!-- Intervalo + precio -->
        <div class="hidden sm:block text-right flex-shrink-0">
          <p class="text-sm font-bold text-gray-900">{{ formatPrice(sub.pricePaid) }}</p>
          <p class="text-xs text-gray-400">{{ INTERVAL_LABELS[sub.interval] }}</p>
        </div>
        <!-- Vencimiento -->
        <div class="hidden md:block text-right flex-shrink-0 text-xs text-gray-500">
          {{ sub.endAt ? new Date(sub.endAt).toLocaleDateString('es') : '—' }}
        </div>
        <!-- Cancelar -->
        <button
          v-if="sub.status === 'ACTIVE' || sub.status === 'TRIAL'"
          class="flex-shrink-0 text-xs text-red-500 hover:text-red-700 font-medium"
          @click="$emit('cancel', sub.id)"
        >Cancelar</button>
      </div>
    </div>

    <!-- Paginación -->
    <div v-if="totalSubs > 20" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
      <span class="text-sm text-gray-500">{{ totalSubs }} suscripciones</span>
      <div class="flex gap-2">
        <button class="btn-secondary text-sm px-3 py-1" :disabled="subPage === 1" @click="$emit('change-page', subPage - 1)">Anterior</button>
        <button class="btn-secondary text-sm px-3 py-1" :disabled="subPage * 20 >= totalSubs" @click="$emit('change-page', subPage + 1)">Siguiente</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PlusIcon, CreditCardIcon } from '@heroicons/vue/24/outline'
import { SUB_STATUS_LABELS, SUB_STATUS_CLASSES, INTERVAL_LABELS, type Plan, type Subscription } from '~/composables/commerce/usePlans'

defineProps<{
  subscriptions: Subscription[]
  plans: Plan[]
  loading: boolean
  statusFilter: string
  planFilter: string
  totalSubs: number
  subPage: number
  formatPrice: (n: number) => string
}>()

defineEmits<{
  'update:status-filter': [value: string]
  'update:plan-filter': [value: string]
  assign: []
  cancel: [id: string]
  'change-page': [page: number]
}>()
</script>
