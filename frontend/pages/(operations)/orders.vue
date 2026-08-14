<template>
  <div>
    <PageHeader
      title="Gestión de Pedidos"
      description="Sistema de pedidos y programación de servicios"
      :icon="ShoppingCartIcon"
      :breadcrumb="[{ label: 'Pedidos' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton :icon="ArrowPathIcon" :loading="loading" :disabled="loading" @click="applyFilters">
          Actualizar
        </HeaderActionButton>
        <HeaderActionButton
          variant="primary"
          :icon="CalendarIcon"
          :disabled="kycStatus !== undefined && kycStatus !== 'APPROVED'"
          @click="openScheduleModal"
        >
          Programar
        </HeaderActionButton>
        <HeaderActionButton
          variant="primary"
          :icon="PlusIcon"
          :disabled="kycStatus !== undefined && kycStatus !== 'APPROVED'"
          @click="openNewOrderModal"
        >
          Nuevo Pedido
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null"><XMarkIcon class="h-4 w-4" /></button>
    </div>

    <!-- KYC banner -->
    <div v-if="kycStatus && kycStatus !== 'APPROVED'" class="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
      Debes verificar tu identidad antes de crear pedidos.
      <NuxtLink to="/verification" class="font-semibold underline">Completa la verificación</NuxtLink>.
    </div>

    <!-- Plan banner -->
    <PlanUsageBanner :usage="usage" :show="['orders']" />

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Columna principal (2/3) -->
      <div class="lg:col-span-2 space-y-4">

        <OrderStatusFilterBar :model-value="activeStatusFilter" @update:model-value="setStatusFilter" />

        <!-- Búsqueda -->
        <div class="card p-4">
          <div class="relative">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar cliente o número de pedido..."
              class="input-field pl-9"
              @keydown.enter="applyFilters"
            />
          </div>
        </div>

        <ActiveOrdersList
          :orders="activeOrders"
          :loading="loading"
          :updating-order-id="updatingOrderId"
          :format-currency="formatCurrency"
          :format-date="formatDate"
          @view-details="openDetailsModal"
          @update-status="doUpdateStatus"
        />

        <ScheduledOrdersList
          :orders="scheduledOrders"
          :loading="loading"
          :updating-order-id="updatingOrderId"
          :format-currency="formatCurrency"
          :format-date="formatDate"
          @view-details="openDetailsModal"
          @update-status="doUpdateStatus"
        />

        <MarketplaceOrdersPanel v-if="hasCatalogProducts" />

        <RecentOrdersList
          :orders="recentOrders"
          :loading="loading"
          :current-page="currentPage"
          :total-pages="totalPages"
          :format-currency="formatCurrency"
          :format-date="formatDate"
          @view-details="openDetailsModal"
          @change-page="goPage"
        />
      </div>

      <!-- Sidebar (1/3) -->
      <OrdersSidebar
        :stats="stats"
        :loading-stats="loadingStats"
        :format-currency="formatCurrency"
        @new-order="openNewOrderModal"
        @schedule="openScheduleModal"
      />
    </div>

    <NewOrderModal
      :show="showNewOrderModal"
      :loading="loading"
      :format-currency="formatCurrency"
      @close="showNewOrderModal = false"
      @submit="submitNewOrder"
    />

    <ScheduleOrderModal
      :show="showScheduleModal"
      :loading="loading"
      @close="showScheduleModal = false"
      @submit="submitSchedule"
    />

    <OrderDetailsModal
      :show="showDetailsModal"
      :order="selectedOrder"
      :updating-order-id="updatingOrderId"
      :downloading-receipt="downloadingReceipt"
      :format-currency="formatCurrency"
      :format-date="formatDate"
      @close="showDetailsModal = false"
      @update-status="(order, ns) => { doUpdateStatus(order, ns); showDetailsModal = false }"
      @download-receipt="handleDownloadReceipt"
      @delete="confirmDelete"
    />

    <DeleteOrderModal
      :show="showCancelConfirm"
      :order="selectedOrder"
      :loading="loading"
      @close="showCancelConfirm = false"
      @confirm="doDelete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ShoppingCartIcon, CalendarIcon, PlusIcon,
  XMarkIcon, ArrowPathIcon, MagnifyingGlassIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import PlanUsageBanner from '~/components/plans/PlanUsageBanner.vue'
import OrderStatusFilterBar from '~/components/orders/OrderStatusFilterBar.vue'
import ActiveOrdersList from '~/components/orders/ActiveOrdersList.vue'
import ScheduledOrdersList from '~/components/orders/ScheduledOrdersList.vue'
import MarketplaceOrdersPanel from '~/components/orders/MarketplaceOrdersPanel.vue'
import RecentOrdersList from '~/components/orders/RecentOrdersList.vue'
import OrdersSidebar from '~/components/orders/OrdersSidebar.vue'
import NewOrderModal from '~/components/orders/NewOrderModal.vue'
import ScheduleOrderModal from '~/components/orders/ScheduleOrderModal.vue'
import OrderDetailsModal from '~/components/orders/OrderDetailsModal.vue'
import DeleteOrderModal from '~/components/orders/DeleteOrderModal.vue'
import {
  useMerchantOrders,
  type Order, type CreateOrderPayload, type OrderStatus,
} from '~/composables/catalog/useMerchantOrders'
import { usePlans } from '~/composables/commerce/usePlans'
import { useReceipts } from '~/composables/receipts/useReceipts'
import { useKyc } from '~/composables/kyc/useKyc'

definePageMeta({ middleware: 'auth' })

const {
  orders, stats, loading, loadingStats, error, totalCount, currentPage,
  activeOrders, recentOrders,
  loadOrders, loadStats, createOrder, updateStatus, deleteOrder,
  formatCurrency, formatDate,
} = useMerchantOrders()

const { myStatus: myKycStatus, fetchMyStatus: fetchMyKycStatus } = useKyc()
const kycStatus = computed(() => myKycStatus.value?.kycStatus)

const scheduledOrders = computed(() =>
  orders.value.filter(o => o.orderType === 'SCHEDULED' && o.scheduledAt && !['DELIVERED','CANCELLED'].includes(o.status))
)
const scheduledCount = computed(() =>
  orders.value.filter(o => o.orderType === 'SCHEDULED' && !['DELIVERED','CANCELLED'].includes(o.status)).length
)
const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / 20)))

const headerStats = computed(() => [
  { label: 'Activos',      value: String(stats.value?.activeOrders ?? 0) },
  { label: 'Programados',  value: String(scheduledCount.value) },
  { label: 'Completados',  value: String(stats.value?.completedOrders ?? 0) },
  { label: 'Ingresos mes', value: stats.value ? formatCurrency(stats.value.monthlyRevenue) : '—' },
])

const activeStatusFilter = ref<OrderStatus | undefined>(undefined)
const searchQuery = ref('')

function setStatusFilter(val: OrderStatus | undefined) {
  activeStatusFilter.value = val
  applyFilters()
}

function applyFilters() {
  loadOrders({ status: activeStatusFilter.value, search: searchQuery.value || undefined, page: 1 })
}

function goPage(page: number) {
  loadOrders({ status: activeStatusFilter.value, search: searchQuery.value || undefined, page })
}

// Modals
const showNewOrderModal = ref(false)
const showScheduleModal = ref(false)
const showDetailsModal  = ref(false)
const showCancelConfirm = ref(false)
const selectedOrder     = ref<Order | null>(null)

function openDetailsModal(order: Order) { selectedOrder.value = order; showDetailsModal.value = true }
function confirmDelete(order: Order) { selectedOrder.value = order; showDetailsModal.value = false; showCancelConfirm.value = true }

const { loading: downloadingReceipt, getOrCreateAndDownload } = useReceipts()
async function handleDownloadReceipt(order: Order) { await getOrCreateAndDownload(order.id) }
async function doDelete() {
  if (!selectedOrder.value) return
  await deleteOrder(selectedOrder.value.id)
  showCancelConfirm.value = false; selectedOrder.value = null
}
const updatingOrderId = ref<string | null>(null)
async function doUpdateStatus(order: Order, nextStatus: OrderStatus) {
  if (updatingOrderId.value) return
  updatingOrderId.value = order.id
  try {
    await updateStatus(order.id, nextStatus)
  } finally {
    updatingOrderId.value = null
  }
}

function openNewOrderModal() { showNewOrderModal.value = true }
async function submitNewOrder(payload: CreateOrderPayload) {
  const created = await createOrder(payload)
  if (created) showNewOrderModal.value = false
}

function openScheduleModal() { showScheduleModal.value = true }
async function submitSchedule(payload: CreateOrderPayload) {
  const created = await createOrder(payload)
  if (created) showScheduleModal.value = false
}

// Marketplace: gating de visibilidad (el panel se autogestiona por completo)
const { usage, fetchUsage } = usePlans()
const hasCatalogProducts = computed(() => (usage.value?.usage?.products ?? 0) > 0)

onMounted(async () => {
  loadOrders({ page: 1, limit: 20 })
  loadStats()
  fetchMyKycStatus()
  await fetchUsage()
})
</script>
