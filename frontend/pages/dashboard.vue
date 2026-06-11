<template>
  <div>
    <!-- Hero Section - Personalizado por Rol -->
    <DashboardHero :config="personalizedHeroConfig" />

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

    <!-- Resumen de actividad personal - Solo NORMAL -->
    <MyActivitySummaryWidget
      v-if="canViewWidget('myOrders')"
      :orders="myOrders"
      :requests="myServiceRequests"
      :loading="loadingMyOrders || loadingMyServiceRequests"
    />

    <!-- Alertas dinámicas (bajo stock, gastos vencidos, etc.) -->
    <DashboardAlerts v-if="canViewWidget('salesToday') || canViewWidget('activeOrders')" />

    <!-- KPIs Header: título + selector de período + botón personalizar -->
    <div v-if="canViewWidget('salesToday') || canViewWidget('activeOrders')" class="flex items-center justify-between mb-4">
      <h2 class="text-base font-semibold text-gray-600">Indicadores</h2>
      <div class="flex items-center gap-2">
        <!-- Selector de período -->
        <div class="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            v-for="p in (['7d', '30d', '90d'] as DashboardPeriod[])"
            :key="p"
            @click="handlePeriodChange(p)"
            class="px-3 py-1 text-xs font-semibold rounded-md transition-colors"
            :class="selectedPeriod === p
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'"
          >
            {{ PERIOD_LABELS[p] }}
          </button>
        </div>
        <!-- Botón personalizar -->
        <button
          @click="showCustomizePanel = !showCustomizePanel"
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
          :class="showCustomizePanel
            ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
            : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'"
        >
          <AdjustmentsHorizontalIcon class="h-3.5 w-3.5" />
          Personalizar
        </button>
      </div>
    </div>

    <!-- Panel de personalización -->
    <DashboardCustomizePanel
      :open="showCustomizePanel"
      :kpi-items="kpiLayout"
      :widget-name="widgetName"
      @toggle="toggleVisibility"
      @reset="resetLayout"
    />

    <!-- KPIs Grid - Dinámico con drag & drop -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <template v-for="item in kpiLayout" :key="item.id">
        <DraggableWidget
          v-if="item.visible && canViewWidget(item.id)"
          :widget-id="item.id"
          @drag-swap="reorder"
        >
          <SalesTodayWidget
            v-if="item.id === 'salesToday'"
            :sales="kpis.salesToday"
            :change="kpis.salesTodayChange"
            :label="PERIOD_SALES_LABELS[selectedPeriod]"
            :loading="loading"
          />
          <ActiveOrdersWidget
            v-else-if="item.id === 'activeOrders'"
            :count="kpis.activeOrders"
            :change="kpis.activeOrdersChange"
            :loading="loading"
          />
          <LowStockWidget
            v-else-if="item.id === 'lowStock'"
            :count="kpis.lowStockProducts"
            :change="kpis.lowStockChange"
            :loading="loading"
          />
          <NewCustomersWidget
            v-else-if="item.id === 'newCustomers'"
            :count="kpis.newCustomers"
            :change="kpis.newCustomersChange"
            :label="PERIOD_CUSTOMERS_LABELS[selectedPeriod]"
            :loading="loading"
          />
        </DraggableWidget>
      </template>
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

      <!-- My Orders Widget - Para usuarios NORMAL -->
      <MyOrdersWidget
        v-if="canViewWidget('myOrders')"
        :orders="myOrders"
        :loading="loadingMyOrders"
      />

      <!-- My Service Requests Widget - Para usuarios NORMAL -->
      <MyServiceRequestsWidget
        v-if="canViewWidget('myServiceRequests')"
        :requests="myServiceRequests"
        :loading="loadingMyServiceRequests"
      />

      <!-- Quick Actions - Filtradas por rol -->
      <QuickActions :actions="quickActions" :class="{ 'lg:col-span-2': userRole === 'NORMAL' }" />
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
  middleware: 'auth'
})

import { ExclamationTriangleIcon, ServerIcon, AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import { useDashboard } from '~/composables/useDashboard'
import { useDashboardWidgets } from '~/composables/useDashboardWidgets'
import { useDashboardPeriod, type DashboardPeriod } from '~/composables/useDashboardPeriod'
import { useDashboardLayout } from '~/composables/useDashboardLayout'
import { type Order, type OrderStatus } from '~/composables/useClienteDashboard'
import DashboardHero from '~/components/dashboard/DashboardHero.vue'
import DashboardAlerts from '~/components/dashboard/DashboardAlerts.vue'
import DashboardCustomizePanel from '~/components/dashboard/DashboardCustomizePanel.vue'
import DraggableWidget from '~/components/dashboard/DraggableWidget.vue'
import QuickActions from '~/components/dashboard/QuickActions.vue'
import SalesTodayWidget from '~/components/dashboard/widgets/SalesTodayWidget.vue'
import ActiveOrdersWidget from '~/components/dashboard/widgets/ActiveOrdersWidget.vue'
import LowStockWidget from '~/components/dashboard/widgets/LowStockWidget.vue'
import NewCustomersWidget from '~/components/dashboard/widgets/NewCustomersWidget.vue'
import OrdersListWidget from '~/components/dashboard/widgets/OrdersListWidget.vue'
import AnalyticsOverviewWidget from '~/components/dashboard/widgets/AnalyticsOverviewWidget.vue'
import MyOrdersWidget from '~/components/dashboard/widgets/MyOrdersWidget.vue'
import MyServiceRequestsWidget from '~/components/dashboard/widgets/MyServiceRequestsWidget.vue'
import MyActivitySummaryWidget from '~/components/dashboard/widgets/MyActivitySummaryWidget.vue'
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

// Selector de período
const { period: selectedPeriod, setPeriod, PERIOD_LABELS, PERIOD_SALES_LABELS, PERIOD_CUSTOMERS_LABELS } = useDashboardPeriod()

function handlePeriodChange(p: DashboardPeriod) {
  setPeriod(p)
  loadDashboard(p)
}

// Layout personalizable
const { kpiLayout, load: loadLayout, toggleVisibility, reorder, reset: resetLayout, widgetName } = useDashboardLayout()
const showCustomizePanel = ref(false)

// Customer-specific data (for NORMAL users)
const myOrders = ref([])
const myServiceRequests = ref([])
const loadingMyOrders = ref(false)
const loadingMyServiceRequests = ref(false)

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string
const { getHeaders } = useAuth()

// Load customer data
async function loadCustomerData() {
  // Load my orders
  loadingMyOrders.value = true
  try {
    const res = await $fetch(`${apiUrl}/orders/mine`, { headers: getHeaders() })
    myOrders.value = res.data ?? []
  } catch (e) {
    console.error('Error loading my orders:', e)
  } finally {
    loadingMyOrders.value = false
  }

  // Load my service requests
  loadingMyServiceRequests.value = true
  try {
    const res = await $fetch(`${apiUrl}/services/requests/mine?as=client`, { headers: getHeaders() })
    myServiceRequests.value = res.data ?? []
  } catch (e) {
    console.error('Error loading service requests:', e)
  } finally {
    loadingMyServiceRequests.value = false
  }
}

// Widget visibility by role
const { heroConfig, quickActions, canViewWidget } = useDashboardWidgets()
const { user } = useAuth()
const userRole = computed(() => user.value?.role)

// Saludo personalizado para usuarios NORMAL
function timeGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const personalizedHeroConfig = computed(() => {
  if (userRole.value === 'NORMAL') {
    const name = user.value?.firstName
    return {
      ...heroConfig.value,
      title: name ? `${timeGreeting()}, ${name}` : heroConfig.value.title,
      subtitle: 'Aquí tienes un resumen de tu actividad reciente',
    }
  }
  return heroConfig.value
})

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
  loadLayout()
  await loadDashboard(selectedPeriod.value)
  // Load customer-specific data for NORMAL users
  if (userRole.value === 'NORMAL') {
    await loadCustomerData()
  }
  refreshTimer = setInterval(() => {
    loadDashboard(selectedPeriod.value)
    if (userRole.value === 'NORMAL') {
      loadCustomerData()
    }
  }, 60_000)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearTimeout(toastTimer)
})
</script>
