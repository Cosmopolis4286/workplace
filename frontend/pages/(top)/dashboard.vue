<template>
  <div class="space-y-5 sm:space-y-8">
    <!-- Hero Section - Personalizado por Rol -->
    <DashboardHero :config="personalizedHeroConfig" />

    <!-- Quick Actions - Filtradas por rol -->
    <QuickActions :actions="quickActions" />

    <!-- Error Banner -->
    <div v-if="error" class="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
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

    <!-- Business Health Score: salud general del negocio (Business Shield) -->
    <BusinessHealthWidget v-if="canViewWidget('salesToday') || canViewWidget('activeOrders')" />

    <!-- Purchasing Power: poder adquisitivo operativo (Business Shield) — no aplica a SUPERADMIN/ADMIN, que no tienen Commerce propio -->
    <PurchasingPowerWidget v-if="!isPlatformAdmin && (canViewWidget('salesToday') || canViewWidget('activeOrders'))" />

    <!-- Alertas dinámicas (bajo stock, gastos vencidos, etc.) -->
    <DashboardAlerts v-if="canViewWidget('salesToday') || canViewWidget('activeOrders')" />

    <!-- Sección de Indicadores: header + panel de personalización + grid de KPIs -->
    <div v-if="canViewWidget('salesToday') || canViewWidget('activeOrders')">
      <!-- KPIs Header: título + selector de período + botón personalizar -->
      <div class="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <h2 class="text-sm sm:text-base font-semibold text-gray-600 flex-shrink-0">Indicadores</h2>
        <div class="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none">
          <!-- Selector de período -->
          <div class="flex gap-1 bg-gray-100 p-1 rounded-lg flex-shrink-0">
            <button
              v-for="p in (['7d', '30d', '90d'] as DashboardPeriod[])"
              :key="p"
              @click="handlePeriodChange(p)"
              class="px-2.5 sm:px-3 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap"
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
            class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors flex-shrink-0 whitespace-nowrap"
            :class="showCustomizePanel
              ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
              : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            <AdjustmentsHorizontalIcon class="h-3.5 w-3.5" />
            <span class="hidden sm:inline">Personalizar</span>
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

      <!-- KPIs: scroll horizontal en mobile, grid desde md -->
      <div class="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0">
        <template v-for="item in kpiLayout" :key="item.id">
          <DraggableWidget
            v-if="item.visible && canViewWidget(item.id)"
            :widget-id="item.id"
            class="w-[75%] sm:w-[45%] md:w-auto flex-shrink-0 snap-start md:flex-shrink"
            @drag-swap="reorder"
          >
            <SalesTodayWidget
              v-if="item.id === 'salesToday'"
              :sales="kpis.salesToday"
              :change="kpis.salesTodayChange"
              :label="isPlatformAdmin ? 'GMV Plataforma' : PERIOD_SALES_LABELS[selectedPeriod]"
              :loading="loading"
              :trend="trends?.salesToday ?? []"
            />
            <ActiveOrdersWidget
              v-else-if="item.id === 'activeOrders'"
              :count="kpis.activeOrders"
              :change="kpis.activeOrdersChange"
              :label="isPlatformAdmin ? 'Pedidos activos (todos)' : 'Pedidos activos'"
              :loading="loading"
              :trend="trends?.activeOrders ?? []"
            />
            <ActiveOrdersWidget
              v-else-if="item.id === 'activeServiceRequests'"
              :count="kpis.activeOrders"
              :change="kpis.activeOrdersChange"
              label="Solicitudes activas"
              :loading="loading"
              :trend="trends?.activeOrders ?? []"
            />
            <LowStockWidget
              v-else-if="item.id === 'lowStock'"
              :count="kpis.lowStockProducts"
              :change="kpis.lowStockChange"
              :loading="loading"
              :trend="trends?.lowStock ?? []"
            />
            <NewCustomersWidget
              v-else-if="item.id === 'newCustomers'"
              :count="kpis.newCustomers"
              :change="kpis.newCustomersChange"
              :label="isPlatformAdmin ? 'Usuarios nuevos' : PERIOD_CUSTOMERS_LABELS[selectedPeriod]"
              :trend="trends?.newCustomers ?? []"
              :loading="loading"
            />
          </DraggableWidget>
        </template>
      </div>
    </div>

    <!-- Main Content Grid - Pedidos -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Orders List - Solo si el rol puede verlo -->
      <OrdersListWidget
        v-if="canViewWidget('ordersList')"
        :orders="activeOrders"
        :loading="loading"
        :last-updated="lastUpdated"
        :readonly="isPlatformAdmin"
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

      <!-- Provider Service Requests Widget - Para FREELANCER (solicitudes recibidas) -->
      <ProviderServiceRequestsWidget
        v-if="canViewWidget('providerServiceRequests')"
        :requests="providerServiceRequests"
        :loading="loadingProviderServiceRequests"
      />
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
    />

    <!-- System Health - Solo SUPERADMIN -->
    <div v-if="canViewWidget('systemHealth')" class="bg-white rounded-2xl border border-gray-100 p-5 sm:p-6">
      <div class="flex items-center gap-2.5 mb-4">
        <div class="flex items-center justify-center w-8 h-8 rounded-full bg-purple-50">
          <ServerIcon class="h-4 w-4 text-purple-600" />
        </div>
        <h3 class="text-sm font-semibold text-gray-900 tracking-tight">Estado del sistema</h3>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="text-center">
          <p class="text-lg font-bold text-gray-900">{{ orderStats?.totalOrders ?? '—' }}</p>
          <p class="text-[11px] text-gray-400 font-medium">Pedidos totales</p>
        </div>
        <div class="text-center">
          <p class="text-lg font-bold text-gray-900">{{ kpis.activeOrders }}</p>
          <p class="text-[11px] text-gray-400 font-medium">Pedidos activos</p>
        </div>
        <div class="text-center">
          <p class="text-lg font-bold text-gray-900">{{ orderStats?.cancelledOrders ?? '—' }}</p>
          <p class="text-[11px] text-gray-400 font-medium">Cancelados</p>
        </div>
        <div class="text-center">
          <p class="text-lg font-bold text-gray-900">{{ kpis.newCustomers }}</p>
          <p class="text-[11px] text-gray-400 font-medium">Usuarios nuevos</p>
        </div>
      </div>
      <p class="text-xs text-gray-400 mt-4">
        Actividad agregada de toda la plataforma · {{ lastUpdated ? formatLastUpdated() : 'cargando…' }}
      </p>
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
import { useDashboard } from '~/composables/dashboard/useDashboard'
import { useCustomerDashboard } from '~/composables/dashboard/useCustomerDashboard'
import { useFreelancerDashboard } from '~/composables/dashboard/useFreelancerDashboard'
import { useDashboardWidgets } from '~/composables/dashboard/useDashboardWidgets'
import { useDashboardPeriod, type DashboardPeriod } from '~/composables/dashboard/useDashboardPeriod'
import { useDashboardLayout } from '~/composables/dashboard/useDashboardLayout'
import { type Order, type OrderStatus } from '~/composables/catalog/useMerchantOrders'
import DashboardHero from '~/components/dashboard/DashboardHero.vue'
import DashboardAlerts from '~/components/dashboard/DashboardAlerts.vue'
import BusinessHealthWidget from '~/components/dashboard/BusinessHealthWidget.vue'
import PurchasingPowerWidget from '~/components/dashboard/PurchasingPowerWidget.vue'
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
import ProviderServiceRequestsWidget from '~/components/dashboard/widgets/ProviderServiceRequestsWidget.vue'
import MyActivitySummaryWidget from '~/components/dashboard/widgets/MyActivitySummaryWidget.vue'
import OrderDetailModal from '~/components/modals/OrderDetailModal.vue'

// Dashboard data
const {
  kpis,
  activeOrders,
  orderStats,
  trends,
  loading,
  error,
  lastUpdated,
  loadDashboard,
  updateOrderStatus,
  markOrderPaid,
  formatLastUpdated,
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

// Datos del propio usuario NORMAL: pedidos hechos y solicitudes de servicio enviadas
const { myOrders, myServiceRequests, loadingMyOrders, loadingMyServiceRequests, loadCustomerData } = useCustomerDashboard()

// Datos del propio FREELANCER: solicitudes de servicio recibidas como proveedor
const {
  myServiceRequests: providerServiceRequests,
  loadingMyServiceRequests: loadingProviderServiceRequests,
  loadFreelancerData,
} = useFreelancerDashboard()

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
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmado',
      PREPARING: 'Preparando',
      READY: 'Listo',
      OUT_FOR_DELIVERY: 'En entrega',
      DELIVERED: 'Entregado',
      CANCELLED: 'Cancelado',
    }
    const type = status === 'CANCELLED' ? 'warning' : 'success'
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

// role=PROFESIONAL ya no distingue COMMERCE de FREELANCER — accountType
// (resuelto por el backend) es la fuente real para esta distinción.
const isFreelancerAccount = computed(() => user.value?.accountType === 'FREELANCER')

// SUPERADMIN/ADMIN no tienen un Commerce propio: widgets como Poder
// Adquisitivo (cesta de compras de UN comercio) no tienen un agregado de
// plataforma con sentido de negocio, así que se ocultan directamente en vez
// de mostrar datos vacíos/erróneos (ver BusinessHealthWidget para el caso
// que sí tiene una vista de plataforma propia).
const isPlatformAdmin = computed(() => userRole.value === 'SUPERADMIN' || userRole.value === 'ADMIN')

onMounted(async () => {
  loadLayout()
  await loadDashboard(selectedPeriod.value)
  // Load customer-specific data for NORMAL users
  if (userRole.value === 'NORMAL') {
    await loadCustomerData()
  }
  // Load provider-specific data (solicitudes recibidas) for FREELANCER accounts
  if (isFreelancerAccount.value) {
    await loadFreelancerData()
  }
  refreshTimer = setInterval(() => {
    loadDashboard(selectedPeriod.value)
    if (userRole.value === 'NORMAL') {
      loadCustomerData()
    }
    if (isFreelancerAccount.value) {
      loadFreelancerData()
    }
  }, 60_000)
})

onUnmounted(() => {
  clearInterval(refreshTimer)
  clearTimeout(toastTimer)
})
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
