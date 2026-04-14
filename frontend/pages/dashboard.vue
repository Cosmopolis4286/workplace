<template>
  <div>
    <!-- Hero Section - Personalizado por Rol -->
    <DashboardHero :config="heroConfig" />

    <!-- Error Banner -->
    <div v-if="error" class="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
      <ExclamationTriangleIcon class="h-5 w-5 text-red-500 flex-shrink-0" />
      <span class="text-sm text-red-700">{{ error }}</span>
      <button class="ml-auto text-red-500 hover:text-red-700" @click="loadDashboard">Reintentar</button>
    </div>

    <!-- Toast -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300 transform"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-200 transform"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div
          v-if="toast.visible"
          class="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium"
          :class="{
            'bg-green-600': toast.type === 'success',
            'bg-red-600': toast.type === 'error',
            'bg-amber-500': toast.type === 'warning',
            'bg-blue-600': toast.type === 'info',
          }"
        >
          {{ toast.message }}
        </div>
      </Transition>
    </Teleport>

    <!-- KPIs Grid - Solo widgets que el rol puede ver -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <SalesTodayWidget
        v-if="canViewWidget('salesToday')"
        :sales="kpis.salesToday"
        :change="kpis.salesTodayChange"
        :loading="loading"
      />
      <ActiveOrdersWidget
        v-if="canViewWidget('activeOrders')"
        :count="kpis.activeOrders"
        :loading="loading"
      />
      <LowStockWidget
        v-if="canViewWidget('lowStock')"
        :count="kpis.lowStockProducts"
        :loading="loading"
      />
      <NewCustomersWidget
        v-if="canViewWidget('newCustomers')"
        :count="kpis.newCustomers"
        :change="kpis.newCustomersChange"
        :loading="loading"
      />
    </div>

    <!-- Main Content Grid - Pedidos + Acciones Rápidas -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Orders List - Solo si el rol puede verlo -->
      <OrdersListWidget
        v-if="canViewWidget('ordersList')"
        :orders="activeOrders"
        :loading="loading"
        :last-updated="lastUpdated"
        @refresh="loadDashboard"
        @view-details="openDetail"
        @status-change="handleStatusChange"
      />

      <!-- Quick Actions - Filtradas por rol -->
      <QuickActions :actions="quickActions" />
    </div>

    <!-- Analytics Overview - Solo ADMIN/SUPERADMIN -->
    <AnalyticsOverviewWidget
      v-if="canViewWidget('analyticsOverview')"
      :kpis="{
        avgPrepTime: kpis.avgPrepTime,
        customerSatisfaction: kpis.customerSatisfaction,
        avgDeliveryTime: kpis.avgDeliveryTime,
      }"
      :loading="loading"
      :last-updated="lastUpdated"
      class="mb-8"
    />

    <!-- System Health - Solo SUPERADMIN -->
    <div v-if="canViewWidget('systemHealth')" class="card-premium p-6 mb-8">
      <div class="flex items-center mb-4">
        <div class="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg mr-3">
          <ServerIcon class="h-6 w-6 text-white" />
        </div>
        <h3 class="text-xl font-bold text-gray-900">Estado del Sistema</h3>
      </div>
      <p class="text-gray-500">Vista de administrador del sistema</p>
    </div>

    <!-- Order Detail Modal -->
    <OrderDetailModal
      :is-open="showDetailModal"
      :order="selectedOrder"
      @close="closeDetail"
      @status-change="handleStatusChange"
      @mark-paid="handleMarkPaid"
    />
  </div>
</template>

<script setup lang="ts">
// Middleware para validar acceso al dashboard
definePageMeta({
  middleware: 'dashboard-access'
})

import { ExclamationTriangleIcon, ServerIcon } from '@heroicons/vue/24/outline'
import { useDashboard } from '~/composables/useDashboard'
import { useDashboardWidgets } from '~/composables/useDashboardWidgets'
import { type Order, type OrderStatus } from '~/composables/useClienteDashboard'
import DashboardHero from '~/components/dashboard/DashboardHero.vue'
import QuickActions from '~/components/dashboard/QuickActions.vue'
import SalesTodayWidget from '~/components/dashboard/widgets/SalesTodayWidget.vue'
import ActiveOrdersWidget from '~/components/dashboard/widgets/ActiveOrdersWidget.vue'
import LowStockWidget from '~/components/dashboard/widgets/LowStockWidget.vue'
import NewCustomersWidget from '~/components/dashboard/widgets/NewCustomersWidget.vue'
import OrdersListWidget from '~/components/dashboard/widgets/OrdersListWidget.vue'
import AnalyticsOverviewWidget from '~/components/dashboard/widgets/AnalyticsOverviewWidget.vue'
import OrderDetailModal from '~/components/modals/OrderDetailModal.vue'

// Dashboard data
const {
  kpis,
  activeOrders,
  loading,
  error,
  lastUpdated,
  loadDashboard,
  updateOrderStatus,
  markOrderPaid,
} = useDashboard()

// Widget visibility by role
const { heroConfig, quickActions, canViewWidget } = useDashboardWidgets()

// Toast
const toast = reactive({
  visible: false,
  type: 'success' as 'success' | 'error' | 'warning' | 'info',
  message: '',
})
let toastTimer: ReturnType<typeof setTimeout>

function showToast(type: typeof toast.type, message: string, duration = 3000) {
  clearTimeout(toastTimer)
  toast.type = type
  toast.message = message
  toast.visible = true
  toastTimer = setTimeout(() => {
    toast.visible = false
  }, duration)
}

// Order detail modal
const showDetailModal = ref(false)
const selectedOrder = ref<Order | null>(null)

function openDetail(order: Order) {
  selectedOrder.value = order
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  selectedOrder.value = null
}

// Status transitions
async function handleStatusChange(payload: { id: string; status: string }) {
  const { id, status } = payload
  const ok = await updateOrderStatus(id, status as OrderStatus)
  if (ok) {
    const labels: Record<OrderStatus, string> = {
      PENDIENTE: 'Pendiente',
      CONFIRMADO: 'Confirmado',
      PREPARANDO: 'Preparando',
      LISTO: 'Listo',
      EN_ENTREGA: 'En entrega',
      ENTREGADO: 'Entregado',
      CANCELADO: 'Cancelado',
    }
    const type = status === 'CANCELADO' ? 'warning' : 'success'
    showToast(type, `Pedido actualizado: ${labels[status as OrderStatus]}`)
    if (selectedOrder.value?.id === id) closeDetail()
  } else {
    showToast('error', error.value ?? 'Error al actualizar pedido', 4000)
  }
}

async function handleMarkPaid(id: string) {
  const ok = await markOrderPaid(id)
  if (ok) showToast('success', 'Pago registrado')
}

// Auto-refresh every 60s
let refreshTimer: ReturnType<typeof setInterval>

onMounted(async () => {
  await loadDashboard()
  refreshTimer = setInterval(loadDashboard, 60_000)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearTimeout(toastTimer)
})
</script>
