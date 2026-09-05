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
        <HeaderActionButton :icon="ArrowDownIcon" @click="exportJSON">
          Exportar
        </HeaderActionButton>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openCreate">
          Nueva Venta
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <SalesKpiCards :stats="stats" :loading-stats="loadingStats" :format-currency="formatCurrency" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2">
        <SalesOrdersList
          :active-tab="activeTab"
          :tabs="tabs"
          :active-orders-count="activeOrders.length"
          :filters="filters"
          :loading="loading"
          :orders="displayOrders"
          :current-page="currentPage"
          :total-pages="totalPages"
          :total-count="totalCount"
          :format-currency="formatCurrency"
          :format-date="formatDate"
          @switch-tab="switchTab"
          @search-input="debouncedLoad"
          @apply-filters="applyFilters"
          @clear-filters="clearFilters"
          @create="openCreate"
          @open-detail="openDetail"
          @quick-advance="quickAdvance"
          @edit="openEdit"
          @delete="confirmDelete"
          @change-page="goToPage"
        />
      </div>

      <SalesSidebar :orders="orders" @create="openCreate" @filter-by-status="filterByStatus" />
    </div>

    <!-- Sale modal (create / edit) -->
    <SaleModal
      :is-open="showSaleModal"
      :order="selectedOrder"
      :products="products"
      :saving="loading"
      :eligible-bnpl-providers="eligibleBnplProviders"
      @close="closeModals"
      @save="handleSave"
    />

    <BnplResultModal :result="bnplResult" :format-date="formatDate" @close="bnplResult = null" />

    <!-- Order detail modal -->
    <OrderDetailModal
      :is-open="showDetailModal"
      :order="detailOrder"
      @close="showDetailModal = false"
      @edit="openEdit"
      @status-change="handleStatusChange"
      @mark-paid="handleMarkPaid"
    />

    <DeleteOrderConfirmModal :order="orderToDelete" @close="orderToDelete = null" @confirm="doDelete" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import { ShoppingCartIcon, ArrowDownIcon, PlusIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import SaleModal from '~/components/modals/SaleModal.vue'
import OrderDetailModal from '~/components/modals/OrderDetailModal.vue'
import SalesKpiCards from '~/components/sales/SalesKpiCards.vue'
import SalesOrdersList from '~/components/sales/SalesOrdersList.vue'
import SalesSidebar from '~/components/sales/SalesSidebar.vue'
import BnplResultModal from '~/components/sales/BnplResultModal.vue'
import DeleteOrderConfirmModal from '~/components/sales/DeleteOrderConfirmModal.vue'
import {
  useMerchantOrders,
  NEXT_STATUS,
  type Order,
  type OrderStatus,
  type CreateOrderPayload,
  type OrderFilters,
} from '~/composables/catalog/useMerchantOrders'
import { useMenu, type ProductSelectorItem } from '~/composables/catalog/useMenu'
import { useDataExport } from '~/composables/core/useDataExport'

// ── Composables ───────────────────────────────────────────────────────────────

const {
  orders, stats,
  loading, loadingStats,
  error, totalCount, currentPage,
  activeOrders, recentOrders,
  loadOrders, loadStats, createOrder, updateOrder, updateStatus, deleteOrder,
  getEligibleBnplProviders, initiateBnpl,
  formatCurrency, formatDate,
} = useMerchantOrders()

const { fetchProductsForSelector } = useMenu()
// Catálogo completo (sin paginar) para el selector de producto del modal de
// venta — no usa el estado paginado de useMenu, se carga aparte una sola vez.
const products = ref<ProductSelectorItem[]>([])

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

const { debounced: debouncedLoad } = useDebounce(() => applyFilters(), 350)

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

// ── Quick advance (first next status, skip cancel) ────────────────────────────

async function quickAdvance(order: Order) {
  const nexts = NEXT_STATUS[order.status] ?? []
  const next  = nexts.find(s => s !== 'CANCELLED')
  if (next) await updateStatus(order.id, next)
}

// ── CRUD modal state ──────────────────────────────────────────────────────────

const showSaleModal   = ref(false)
const showDetailModal = ref(false)
const selectedOrder   = ref<Order | null>(null)
const detailOrder     = ref<Order | null>(null)
const orderToDelete   = ref<Order | null>(null)

// ── BNPL (Cashea / Krece) ─────────────────────────────────────────────────────

const eligibleBnplProviders = ref<('CASHEA' | 'KRECE')[]>([])
const bnplResult = ref<{ checkoutUrl: string; expiresAt: string | null } | null>(null)

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
    const created = await createOrder(payload)
    if (created && (payload.paymentMethod === 'CASHEA' || payload.paymentMethod === 'KRECE')) {
      const result = await initiateBnpl(created.id, payload.paymentMethod)
      if (result) {
        bnplResult.value = { checkoutUrl: result.checkoutUrl, expiresAt: result.expiresAt }
      } else if (error.value) {
        // El pedido SÍ se creó — dejar claro que solo falló el link de
        // financiamiento, para que el banner de error tenga sentido una vez
        // cerrado el modal (el usuario ya no ve el contexto de "Nueva Venta").
        error.value = `El pedido se creó, pero no se pudo generar el link de ${payload.paymentMethod}: ${error.value}`
      }
    }
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
  await updateOrder(id, { paymentStatus: 'PAID' })
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

const { exportJSON: downloadJSON } = useDataExport()

function exportJSON() {
  downloadJSON('ventas', orders.value)
}

// ── Init ──────────────────────────────────────────────────────────────────────

onMounted(async () => {
  await Promise.all([
    loadStats(),
    loadOrders(),
    fetchProductsForSelector().then(p => { products.value = p }).catch(() => {}), // non-blocking: catalog may be empty
    getEligibleBnplProviders().then(p => { eligibleBnplProviders.value = p }),
  ])
})
</script>
