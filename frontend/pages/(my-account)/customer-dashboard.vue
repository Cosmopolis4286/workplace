<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">

    <CustomerDashboardHeader :loading="loading || loadingStats" @refresh="loadAll" />

    <div class="p-6 max-w-7xl mx-auto space-y-8">

      <!-- Error banner -->
      <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
        <span class="text-sm">{{ error }}</span>
        <button @click="error = null" class="text-red-500 hover:text-red-700 font-bold text-lg leading-none">×</button>
      </div>

      <CustomerStatCards :stats="stats" :loading-stats="loadingStats" :format-currency="formatCurrency" />

      <CustomerOrderFilters
        :active-status="filters.status"
        :status-count="statusCount"
        :search-query="searchQuery"
        @filter="setFilter"
        @update:search-query="onSearchInput"
        @new-order="showNewOrderModal = true"
      />

      <CustomerActiveOrders
        :orders="activeOrders"
        :loading="loading"
        :format-currency="formatCurrency"
        @view-details="openDetails"
        @update-status="patchStatus"
      />

      <CustomerOrderHistory
        :orders="recentOrders"
        :loading="loading"
        :current-page="currentPage"
        :total-pages="totalPages"
        :format-currency="formatCurrency"
        :format-date="formatDate"
        @view-details="openDetails"
        @change-page="changePage"
      />
    </div>

    <CustomerOrderDetailsModal
      :show="showDetailsModal"
      :order="selectedOrder"
      :format-currency="formatCurrency"
      :format-date="formatDate"
      @close="closeDetailsModal"
      @cancel="cancelOrder"
    />

    <CustomerNewOrderModal
      :show="showNewOrderModal"
      :loading="loading"
      :format-currency="formatCurrency"
      @close="showNewOrderModal = false"
      @submit="submitNewOrder"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import CustomerDashboardHeader from '~/components/customer-dashboard/CustomerDashboardHeader.vue'
import CustomerStatCards from '~/components/customer-dashboard/CustomerStatCards.vue'
import CustomerOrderFilters from '~/components/customer-dashboard/CustomerOrderFilters.vue'
import CustomerActiveOrders from '~/components/customer-dashboard/CustomerActiveOrders.vue'
import CustomerOrderHistory from '~/components/customer-dashboard/CustomerOrderHistory.vue'
import CustomerOrderDetailsModal from '~/components/customer-dashboard/CustomerOrderDetailsModal.vue'
import CustomerNewOrderModal from '~/components/customer-dashboard/CustomerNewOrderModal.vue'
import {
  useMerchantOrders,
  type Order,
  type OrderStatus,
  type CreateOrderPayload,
} from '~/composables/catalog/useMerchantOrders'

const {
  orders,
  stats,
  loading,
  loadingStats,
  error,
  totalCount,
  currentPage,
  activeOrders,
  recentOrders,
  loadOrders,
  loadStats,
  createOrder,
  updateStatus,
  formatCurrency,
  formatDate,
} = useMerchantOrders()

// ── UI state ────────────────────────────────────────────────────────────────
const showDetailsModal  = ref(false)
const showNewOrderModal = ref(false)
const selectedOrder     = ref<Order | null>(null)

// ── Filters ─────────────────────────────────────────────────────────────────
const filters     = ref<{ status?: OrderStatus }>({})
const searchQuery = ref('')
let   searchTimer: ReturnType<typeof setTimeout> | null = null

const statusCount = computed(() => {
  const map: Record<string, number> = {}
  orders.value.forEach(o => { map[o.status] = (map[o.status] ?? 0) + 1 })
  return map
})

const totalPages = computed(() => Math.ceil(totalCount.value / 20))

function setFilter(status?: OrderStatus) {
  filters.value.status = status
  loadOrders({ status, search: searchQuery.value || undefined })
}

function onSearchInput(value: string) {
  searchQuery.value = value
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadOrders({ status: filters.value.status, search: searchQuery.value || undefined })
  }, 350)
}

function changePage(page: number) {
  loadOrders({ status: filters.value.status, search: searchQuery.value || undefined, page })
}

// ── Order actions ────────────────────────────────────────────────────────────
function openDetails(order: Order) {
  selectedOrder.value = order
  showDetailsModal.value = true
}

function closeDetailsModal() {
  showDetailsModal.value = false
  selectedOrder.value = null
}

async function patchStatus(id: string, status: OrderStatus) {
  await updateStatus(id, status)
}

async function cancelOrder(order: Order) {
  const ok = await updateStatus(order.id, 'CANCELLED')
  if (ok) closeDetailsModal()
}

// ── New order form ────────────────────────────────────────────────────────────
async function submitNewOrder(payload: CreateOrderPayload) {
  const result = await createOrder(payload)
  if (result) showNewOrderModal.value = false
}

// ── Load on mount ─────────────────────────────────────────────────────────────
async function loadAll() {
  await Promise.all([loadStats(), loadOrders()])
}

onMounted(() => loadAll())
</script>
