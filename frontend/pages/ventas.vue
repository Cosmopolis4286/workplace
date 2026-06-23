<template>
  <div>
    <PageHeader
      title="Gestión de Ventas"
      description="Control completo de pedidos y transacciones"
      :icon="ShoppingCartIcon"
      :breadcrumb="breadcrumbItems"
      :stats="headerStats"
    >
      <template #actions>
        <button class="btn-secondary flex items-center" @click="exportJSON">
          <ArrowDownIcon class="h-5 w-5 mr-2" />
          Exportar
        </button>
        <button class="btn-primary flex items-center" @click="openCreate">
          <PlusIcon class="h-5 w-5 mr-2" />
          Nueva Venta
        </button>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="card p-5">
        <p class="text-sm text-gray-500">Ingresos del Mes</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">
          <span v-if="loadingStats" class="skeleton h-7 w-28 inline-block rounded" />
          <span v-else>{{ formatCurrency(stats.monthlyRevenue) }}</span>
        </p>
        <p class="text-xs text-gray-400 mt-1">{{ stats.completedOrders }} pedidos completados</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">Pedidos Activos</p>
        <p class="text-2xl font-bold text-indigo-600 mt-1">
          <span v-if="loadingStats" class="skeleton h-7 w-16 inline-block rounded" />
          <span v-else>{{ stats.activeOrders }}</span>
        </p>
        <p class="text-xs text-gray-400 mt-1">{{ stats.pendingOrders }} pendientes</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">Ticket Promedio</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">
          <span v-if="loadingStats" class="skeleton h-7 w-24 inline-block rounded" />
          <span v-else>{{ formatCurrency(stats.avgTicket) }}</span>
        </p>
        <p class="text-xs text-gray-400 mt-1">por pedido</p>
      </div>
      <div class="card p-5">
        <p class="text-sm text-gray-500">Total Pedidos</p>
        <p class="text-2xl font-bold text-gray-900 mt-1">
          <span v-if="loadingStats" class="skeleton h-7 w-16 inline-block rounded" />
          <span v-else>{{ stats.totalOrders }}</span>
        </p>
        <p class="text-xs text-red-500 mt-1" v-if="stats.cancelledOrders > 0">
          {{ stats.cancelledOrders }} cancelados
        </p>
        <p class="text-xs text-gray-400 mt-1" v-else>Sin cancelaciones</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main content -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Tabs: Activos / Historial -->
        <div class="card p-1 flex gap-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-colors"
            :class="activeTab === tab.key
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
            @click="switchTab(tab.key)"
          >
            {{ tab.label }}
            <span v-if="tab.key === 'active' && activeOrders.length > 0"
              class="ml-1.5 bg-indigo-500/30 text-indigo-100 text-xs px-1.5 py-0.5 rounded-full">
              {{ activeOrders.length }}
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
                @input="debouncedLoad"
              />
            </div>
            <select v-model="filters.orderType" class="input-field" @change="applyFilters">
              <option value="">Todos los tipos</option>
              <option v-for="(label, val) in ORDER_TYPE_LABELS" :key="val" :value="val">{{ label }}</option>
            </select>
            <input v-model="filters.dateFrom" type="date" class="input-field" @change="applyFilters" />
            <input v-model="filters.dateTo" type="date" class="input-field" @change="applyFilters" />
          </div>
          <div class="flex justify-end mt-2">
            <button class="text-sm text-gray-400 hover:text-gray-600" @click="clearFilters">Limpiar filtros</button>
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
          <div v-else-if="displayOrders.length === 0" class="p-12 text-center">
            <ShoppingCartIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500">
              {{ activeTab === 'active' ? 'No hay pedidos activos' : 'Sin historial de pedidos' }}
            </p>
            <button class="btn-primary mt-4 text-sm" @click="openCreate">Crear nuevo pedido</button>
          </div>

          <!-- Order rows -->
          <template v-else>
            <div
              v-for="order in displayOrders"
              :key="order.id"
              class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group cursor-pointer"
              @click="openDetail(order)"
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
                  :class="order.paymentStatus === 'PAGADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
                >
                  {{ order.paymentStatus === 'PAGADO' ? 'Pagado' : 'Por cobrar' }}
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
                  @click="quickAdvance(order)"
                >
                  <ArrowRightIcon class="h-4 w-4" />
                </button>
                <button
                  v-if="order.status !== 'ENTREGADO' && order.status !== 'CANCELADO'"
                  class="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                  title="Editar"
                  @click="openEdit(order)"
                >
                  <PencilIcon class="h-4 w-4" />
                </button>
                <button
                  class="p-1.5 rounded hover:bg-red-50 text-red-500"
                  title="Eliminar"
                  @click="confirmDelete(order)"
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
            <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
              Anterior
            </button>
            <span class="text-sm text-gray-600 px-2 py-1">{{ currentPage }} / {{ totalPages }}</span>
            <button class="btn-secondary text-sm px-3 py-1" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
              Siguiente
            </button>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <!-- Quick actions -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Acciones Rápidas</h3>
          <div class="space-y-2">
            <button class="w-full btn-primary text-sm" @click="openCreate">
              <PlusIcon class="h-4 w-4 inline mr-1.5" />
              Nueva Venta
            </button>
            <button class="w-full btn-secondary text-sm" @click="navigateTo('/reportes')">
              <ChartBarIcon class="h-4 w-4 inline mr-1.5" />
              Ver Reportes
            </button>
          </div>
        </div>

        <!-- Active orders by status -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Pipeline de Pedidos</h3>
          <div class="space-y-2.5">
            <div
              v-for="status in pipelineStatuses"
              :key="status"
              class="flex items-center justify-between cursor-pointer group"
              @click="filterByStatus(status)"
            >
              <div class="flex items-center gap-2">
                <div class="h-2.5 w-2.5 rounded-full" :class="pipelineDot(status)" />
                <span class="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  {{ ORDER_STATUS_LABELS[status] }}
                </span>
              </div>
              <span class="text-sm font-semibold text-gray-900">
                {{ countByStatus(status) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Payment breakdown -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Métodos de Pago</h3>
          <div class="space-y-2">
            <div
              v-for="method in paymentBreakdown"
              :key="method.key"
              class="flex items-center justify-between text-sm"
            >
              <span class="text-gray-600">{{ method.label }}</span>
              <span class="font-medium text-gray-800">{{ method.count }}</span>
            </div>
            <div v-if="paymentBreakdown.length === 0" class="text-xs text-gray-400 text-center py-2">Sin datos</div>
          </div>
        </div>

        <!-- Recent alert: unpaid orders -->
        <div v-if="unpaidCount > 0" class="card p-5 bg-yellow-50 border border-yellow-200">
          <h3 class="text-sm font-semibold text-yellow-800 flex items-center gap-1.5 mb-1">
            <ExclamationTriangleIcon class="h-4 w-4" />
            Cobros Pendientes
          </h3>
          <p class="text-sm text-yellow-700">
            {{ unpaidCount }} pedido{{ unpaidCount !== 1 ? 's' : '' }} sin cobrar
          </p>
        </div>
      </div>
    </div>

    <!-- Sale modal (create / edit) -->
    <SaleModal
      :is-open="showSaleModal"
      :order="selectedOrder"
      :products="products"
      :saving="loading"
      @close="closeModals"
      @save="handleSave"
    />

    <!-- Order detail modal -->
    <OrderDetailModal
      :is-open="showDetailModal"
      :order="detailOrder"
      @close="showDetailModal = false"
      @edit="openEdit"
      @status-change="handleStatusChange"
      @mark-paid="handleMarkPaid"
    />

    <!-- Delete confirmation -->
    <TransitionRoot appear :show="!!orderToDelete" as="template">
      <Dialog as="div" class="relative z-50" @close="orderToDelete = null">
        <div class="fixed inset-0 bg-black/25" />
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel class="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <DialogTitle class="text-lg font-semibold text-gray-900 mb-2">Eliminar pedido</DialogTitle>
            <p class="text-sm text-gray-600 mb-5">
              ¿Eliminar pedido <strong>#{{ orderToDelete?.orderNumber }}</strong>? Esta acción no se puede deshacer.
            </p>
            <div class="flex justify-end gap-3">
              <button class="btn-secondary" @click="orderToDelete = null">Cancelar</button>
              <button class="btn-danger" @click="doDelete">Eliminar</button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import {
  ShoppingCartIcon,
  ArrowDownIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ArrowRightIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  FireIcon,
  TruckIcon,
  NoSymbolIcon,
} from '@heroicons/vue/24/outline'
import { Dialog, DialogPanel, DialogTitle, TransitionRoot } from '@headlessui/vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import SaleModal from '~/components/modals/SaleModal.vue'
import OrderDetailModal from '~/components/modals/OrderDetailModal.vue'
import {
  useClienteDashboard,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_CLASSES,
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  NEXT_STATUS,
  type Order,
  type OrderStatus,
  type CreateOrderPayload,
  type OrderFilters,
} from '~/composables/useClienteDashboard'
import { useMenu } from '~/composables/useMenu'

// ── Composables ───────────────────────────────────────────────────────────────

const {
  orders, stats,
  loading, loadingStats,
  error, totalCount, currentPage,
  activeOrders, recentOrders,
  loadOrders, loadStats, createOrder, updateOrder, updateStatus, deleteOrder,
  formatCurrency, formatDate,
} = useClienteDashboard()

const { products, loadMenu } = useMenu()

// ── Breadcrumb & header stats ─────────────────────────────────────────────────

const breadcrumbItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Ventas' },
]

const headerStats = computed(() => [
  {
    label:      'Ingresos Mensuales',
    value:      formatCurrency(stats.value.monthlyRevenue),
    change:     '',
    changeType: 'neutral',
  },
  {
    label:      'Pedidos Activos',
    value:      String(stats.value.activeOrders),
    change:     '',
    changeType: 'neutral',
  },
  {
    label:      'Ticket Promedio',
    value:      formatCurrency(stats.value.avgTicket),
    change:     '',
    changeType: 'neutral',
  },
  {
    label:      'Completados',
    value:      String(stats.value.completedOrders),
    change:     '',
    changeType: 'increase',
  },
])

// ── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'active' | 'history'
const activeTab = ref<Tab>('active')

const tabs = [
  { key: 'active',  label: 'Pedidos Activos' },
  { key: 'history', label: 'Historial' },
]

const displayOrders = computed<Order[]>(() =>
  activeTab.value === 'active' ? activeOrders.value : recentOrders.value,
)

function switchTab(tab: string) {
  activeTab.value = tab as Tab
  clearFilters()
  if (tab === 'history') {
    loadOrders({ page: 1, status: undefined })
  } else {
    loadOrders()
  }
}

// ── Filters ───────────────────────────────────────────────────────────────────

const filters = ref<OrderFilters>({
  search:    '',
  orderType: undefined,
  dateFrom:  '',
  dateTo:    '',
})

const totalPages = computed(() => Math.ceil(totalCount.value / 20))

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedLoad() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => applyFilters(), 350)
}

function applyFilters() {
  loadOrders({ ...filters.value, page: 1 })
}

function clearFilters() {
  filters.value = { search: '', orderType: undefined, dateFrom: '', dateTo: '' }
  loadOrders({ page: 1 })
}

function goToPage(page: number) {
  loadOrders({ ...filters.value, page })
}

function filterByStatus(status: OrderStatus) {
  loadOrders({ status, page: 1 })
}

// ── Sidebar computed data ─────────────────────────────────────────────────────

const pipelineStatuses: OrderStatus[] = ['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'EN_ENTREGA']

function countByStatus(status: OrderStatus) {
  return orders.value.filter(o => o.status === status).length
}

const pipelineDots: Record<OrderStatus, string> = {
  PENDIENTE:   'bg-yellow-400',
  CONFIRMADO:  'bg-blue-400',
  PREPARANDO:  'bg-indigo-500',
  LISTO:       'bg-green-500',
  EN_ENTREGA:  'bg-purple-500',
  ENTREGADO:   'bg-gray-400',
  CANCELADO:   'bg-red-400',
}

function pipelineDot(status: OrderStatus) {
  return pipelineDots[status]
}

const paymentBreakdown = computed(() => {
  const counts: Record<string, number> = {}
  orders.value.forEach(o => { counts[o.paymentMethod] = (counts[o.paymentMethod] ?? 0) + 1 })
  return Object.entries(counts)
    .map(([key, count]) => ({ key, label: PAYMENT_METHOD_LABELS[key as any] ?? key, count }))
    .sort((a, b) => b.count - a.count)
})

const unpaidCount = computed(() =>
  orders.value.filter(o => o.paymentStatus === 'PENDIENTE' && o.status !== 'CANCELADO').length,
)

// ── Status icon helpers ───────────────────────────────────────────────────────

function statusIcon(status: OrderStatus) {
  const map: Record<OrderStatus, any> = {
    PENDIENTE:   ClockIcon,
    CONFIRMADO:  CheckCircleIcon,
    PREPARANDO:  FireIcon,
    LISTO:       CheckCircleIcon,
    EN_ENTREGA:  TruckIcon,
    ENTREGADO:   CheckCircleIcon,
    CANCELADO:   NoSymbolIcon,
  }
  return map[status] ?? ClockIcon
}

function statusBg(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    PENDIENTE:   'bg-yellow-100',
    CONFIRMADO:  'bg-blue-100',
    PREPARANDO:  'bg-indigo-100',
    LISTO:       'bg-green-100',
    EN_ENTREGA:  'bg-purple-100',
    ENTREGADO:   'bg-gray-100',
    CANCELADO:   'bg-red-100',
  }
  return map[status] ?? 'bg-gray-100'
}

function statusIconColor(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    PENDIENTE:   'text-yellow-600',
    CONFIRMADO:  'text-blue-600',
    PREPARANDO:  'text-indigo-600',
    LISTO:       'text-green-600',
    EN_ENTREGA:  'text-purple-600',
    ENTREGADO:   'text-gray-500',
    CANCELADO:   'text-red-500',
  }
  return map[status] ?? 'text-gray-500'
}

// ── Quick advance (first next status, skip cancel) ────────────────────────────

async function quickAdvance(order: Order) {
  const nexts = NEXT_STATUS[order.status] ?? []
  const next  = nexts.find(s => s !== 'CANCELADO')
  if (next) await updateStatus(order.id, next)
}

// ── CRUD modal state ──────────────────────────────────────────────────────────

const showSaleModal   = ref(false)
const showDetailModal = ref(false)
const selectedOrder   = ref<Order | null>(null)
const detailOrder     = ref<Order | null>(null)
const orderToDelete   = ref<Order | null>(null)

function openCreate() {
  selectedOrder.value = null
  showSaleModal.value = true
}

function openEdit(order: Order) {
  selectedOrder.value  = order
  showDetailModal.value = false
  showSaleModal.value  = true
}

function openDetail(order: Order) {
  detailOrder.value    = order
  showDetailModal.value = true
}

function closeModals() {
  showSaleModal.value  = false
  selectedOrder.value  = null
}

async function handleSave(payload: CreateOrderPayload) {
  if (selectedOrder.value) {
    await updateOrder(selectedOrder.value.id, {
      paymentMethod: payload.paymentMethod,
      notes:         payload.notes,
      deliveryAddress: payload.deliveryAddress,
    })
  } else {
    await createOrder(payload)
  }
  closeModals()
}

async function handleStatusChange(id: string, status: OrderStatus) {
  await updateStatus(id, status)
  // Refresh detailOrder ref if it's the same order
  if (detailOrder.value?.id === id) {
    detailOrder.value = orders.value.find(o => o.id === id) ?? detailOrder.value
  }
}

async function handleMarkPaid(id: string) {
  await updateOrder(id, { paymentStatus: 'PAGADO' })
  if (detailOrder.value?.id === id) {
    detailOrder.value = orders.value.find(o => o.id === id) ?? detailOrder.value
  }
}

function confirmDelete(order: Order) {
  orderToDelete.value = order
}

async function doDelete() {
  if (!orderToDelete.value) return
  await deleteOrder(orderToDelete.value.id)
  orderToDelete.value = null
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportJSON() {
  const blob = new Blob([JSON.stringify(orders.value, null, 2)], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `ventas-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    loadStats(),
    loadOrders(),
    loadMenu().catch(() => {}), // non-blocking: catalog may be empty
  ])
})
</script>

<style scoped>
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}
.btn-danger {
  @apply px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition-colors;
}
.skeleton {
  @apply bg-gray-200 animate-pulse;
}
</style>
