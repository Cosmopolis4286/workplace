<template>
  <div class="space-y-4">
    <!-- Tabs: Activos / Historial -->
    <div class="card p-1 flex gap-1">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-colors"
        :class="activeTab === tab.key
          ? 'bg-indigo-600 text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
        @click="$emit('switch-tab', tab.key)"
      >
        {{ tab.label }}
        <span v-if="tab.key === 'active' && activeOrdersCount > 0"
          class="ml-1.5 bg-indigo-500/30 text-indigo-100 text-xs px-1.5 py-0.5 rounded-full">
          {{ activeOrdersCount }}
        </span>
      </button>
    </div>

    <!-- Filters -->
    <div class="card p-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="col-span-2 sm:col-span-1">
          <input
            v-model="filters.search"
            type="text"
            placeholder="Buscar cliente o #pedido..."
            class="input-field"
            @input="$emit('search-input')"
          />
        </div>
        <select v-model="filters.orderType" class="input-field" @change="$emit('apply-filters')">
          <option value="">Todos los tipos</option>
          <option v-for="(label, val) in ORDER_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
        </select>
        <input v-model="filters.dateFrom" type="date" class="input-field" @change="$emit('apply-filters')" />
        <input v-model="filters.dateTo" type="date" class="input-field" @change="$emit('apply-filters')" />
      </div>
      <div class="flex justify-end mt-2">
        <button class="text-sm text-gray-400 hover:text-gray-600" @click="$emit('clear-filters')">Limpiar filtros</button>
      </div>
    </div>

    <!-- Orders list -->
    <div class="card divide-y divide-gray-100">
      <!-- Loading skeleton -->
      <template v-if="loading">
        <div v-for="i in 5" :key="i" class="p-4 flex items-center gap-4">
          <div class="skeleton h-10 w-10 rounded-full" />
          <div class="flex-1 space-y-2">
            <div class="skeleton h-4 w-40 rounded" />
            <div class="skeleton h-3 w-24 rounded" />
          </div>
          <div class="skeleton h-6 w-20 rounded" />
        </div>
      </template>

      <!-- Empty state -->
      <div v-else-if="orders.length === 0" class="p-12 text-center">
        <ShoppingCartIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">
          {{ activeTab === 'active' ? 'No hay pedidos activos' : 'Sin historial de pedidos' }}
        </p>
        <button class="btn-primary mt-4 text-sm" @click="$emit('create')">Crear nuevo pedido</button>
      </div>

      <!-- Order rows -->
      <template v-else>
        <div
          v-for="order in orders"
          :key="order.id"
          class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group cursor-pointer"
          @click="$emit('open-detail', order)"
        >
          <!-- Status icon -->
          <div class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
            :class="statusBg(order.status)">
            <component :is="statusIcon(order.status)" class="h-5 w-5" :class="statusIconColor(order.status)" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="font-medium text-gray-900 text-sm">#{{ order.orderNumber }}</p>
              <span class="text-gray-400">·</span>
              <p class="text-sm text-gray-700 truncate">{{ order.customerName }}</p>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ ORDER_TYPE_LABELS[order.orderType] }}
              <span v-if="order.itemCount"> · {{ order.itemCount }} producto{{ order.itemCount !== 1 ? 's' : '' }}</span>
              <span> · {{ formatDate(order.createdAt) }}</span>
            </p>
          </div>

          <!-- Badges -->
          <div class="hidden sm:flex items-center gap-2">
            <span class="badge" :class="ORDER_STATUS_CLASSES[order.status]">
              {{ ORDER_STATUS_LABELS[order.status] }}
            </span>
            <span
              class="badge text-xs"
              :class="order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
            >
              {{ order.paymentStatus === 'PAID' ? 'Pagado' : 'Por cobrar' }}
            </span>
          </div>

          <!-- Total -->
          <div class="text-right flex-shrink-0">
            <p class="font-semibold text-gray-900 text-sm">{{ formatCurrency(order.total) }}</p>
            <p class="text-xs text-gray-400">{{ PAYMENT_METHOD_LABELS[order.paymentMethod] }}</p>
          </div>

          <!-- Hover actions (stop propagation so row click doesn't fire) -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" @click.stop>
            <button
              v-if="NEXT_STATUS[order.status]?.length"
              class="p-1.5 rounded hover:bg-indigo-50 text-indigo-600"
              title="Avanzar estado"
              @click="$emit('quick-advance', order)"
            >
              <ArrowRightIcon class="h-4 w-4" />
            </button>
            <button
              v-if="order.status !== 'DELIVERED' && order.status !== 'CANCELLED'"
              class="p-1.5 rounded hover:bg-gray-100 text-gray-500"
              title="Editar"
              @click="$emit('edit', order)"
            >
              <PencilIcon class="h-4 w-4" />
            </button>
            <button
              class="p-1.5 rounded hover:bg-red-50 text-red-500"
              title="Eliminar"
              @click="$emit('delete', order)"
            >
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Pagination -->
    <div v-if="activeTab === 'history' && totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-gray-500">{{ totalCount }} pedidos en total</p>
      <div class="flex gap-2">
        <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage <= 1" @click="$emit('change-page', currentPage - 1)">
          Anterior
        </button>
        <span class="text-sm text-gray-600 px-2 py-1">{{ currentPage }} / {{ totalPages }}</span>
        <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage >= totalPages" @click="$emit('change-page', currentPage + 1)">
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ShoppingCartIcon, ArrowRightIcon, PencilIcon, TrashIcon, ClockIcon, CheckCircleIcon, FireIcon, TruckIcon, NoSymbolIcon } from '@heroicons/vue/24/outline'
import {
  ORDER_STATUS_LABELS, ORDER_STATUS_CLASSES, ORDER_TYPE_LABELS, PAYMENT_METHOD_LABELS, NEXT_STATUS,
  type Order, type OrderStatus, type OrderFilters,
} from '~/composables/catalog/useMerchantOrders'

defineProps<{
  activeTab: 'active' | 'history'
  tabs: { key: string; label: string }[]
  activeOrdersCount: number
  filters: OrderFilters
  loading: boolean
  orders: Order[]
  currentPage: number
  totalPages: number
  totalCount: number
  formatCurrency: (n: number) => string
  formatDate: (d: string) => string
}>()

defineEmits<{
  'switch-tab': [key: string]
  'search-input': []
  'apply-filters': []
  'clear-filters': []
  create: []
  'open-detail': [order: Order]
  'quick-advance': [order: Order]
  edit: [order: Order]
  delete: [order: Order]
  'change-page': [page: number]
}>()

function statusIcon(status: OrderStatus) {
  const map: Record<OrderStatus, any> = {
    PENDING:          ClockIcon,
    CONFIRMED:        CheckCircleIcon,
    PREPARING:        FireIcon,
    READY:            CheckCircleIcon,
    OUT_FOR_DELIVERY: TruckIcon,
    DELIVERED:        CheckCircleIcon,
    CANCELLED:        NoSymbolIcon,
  }
  return map[status] ?? ClockIcon
}

function statusBg(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    PENDING:          'bg-yellow-100',
    CONFIRMED:        'bg-blue-100',
    PREPARING:        'bg-indigo-100',
    READY:            'bg-green-100',
    OUT_FOR_DELIVERY: 'bg-purple-100',
    DELIVERED:        'bg-gray-100',
    CANCELLED:        'bg-red-100',
  }
  return map[status] ?? 'bg-gray-100'
}

function statusIconColor(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    PENDING:          'text-yellow-600',
    CONFIRMED:        'text-blue-600',
    PREPARING:        'text-indigo-600',
    READY:            'text-green-600',
    OUT_FOR_DELIVERY: 'text-purple-600',
    DELIVERED:        'text-gray-500',
    CANCELLED:        'text-red-500',
  }
  return map[status] ?? 'text-gray-500'
}
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
</style>
