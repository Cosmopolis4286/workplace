<template>
  <div>
    <!-- Hero Section -->
    <div class="relative overflow-hidden bg-gradient-to-br from-workplace-red via-red-500 to-red-600 rounded-3xl mb-8 shadow-2xl">
      <div class="absolute inset-0 bg-black/10"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-white/10"></div>
      <div class="relative px-8 py-12">
        <div class="flex items-center justify-between">
          <div class="text-white">
            <div class="flex items-center space-x-4 mb-4">
              <div class="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                <ChartBarIcon class="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 class="text-4xl sm:text-5xl font-black mb-2">Dashboard</h1>
                <p class="text-xl text-red-100 font-medium">Bienvenido a tu panel de control WorkPlace Manager</p>
                <div class="flex items-center mt-2 space-x-4">
                  <div class="flex items-center text-red-100">
                    <div class="h-2 w-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    <span class="text-sm font-medium">Sistema activo</span>
                  </div>
                  <div class="text-red-100 text-sm">
                    {{ new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="hidden lg:block">
            <div class="relative">
              <div class="absolute inset-0 bg-white/20 rounded-full blur-xl"></div>
              <div class="relative bg-white/10 backdrop-blur-sm rounded-full p-8">
                <div class="text-center text-white">
                  <div class="text-3xl font-black">{{ currentTime }}</div>
                  <div class="text-sm opacity-80">Hora actual</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <!-- Ventas Hoy -->
      <div class="card-premium p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 bg-gradient-to-br from-workplace-red to-red-600 rounded-xl shadow-lg">
            <CurrencyDollarIcon class="h-6 w-6 text-white" />
          </div>
          <span
            v-if="kpis.salesTodayChange !== null"
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="kpis.salesTodayChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
          >
            {{ formatChange(kpis.salesTodayChange) }}
          </span>
        </div>
        <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1" />
        <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ formatCurrency(kpis.salesToday) }}</div>
        <p class="text-sm text-gray-500 font-medium">Ventas Hoy</p>
        <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-workplace-red to-red-500 rounded-full transition-all duration-700" style="width: 85%" />
        </div>
      </div>

      <!-- Pedidos Activos -->
      <div class="card-premium p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
            <ShoppingCartIcon class="h-6 w-6 text-white" />
          </div>
        </div>
        <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1" />
        <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ kpis.activeOrders }}</div>
        <p class="text-sm text-gray-500 font-medium">Pedidos Activos</p>
        <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-700"
            :style="{ width: Math.min(100, kpis.activeOrders * 5) + '%' }"
          />
        </div>
      </div>

      <!-- Bajo Stock -->
      <div class="card-premium p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-lg">
            <ExclamationTriangleIcon class="h-6 w-6 text-white" />
          </div>
          <span v-if="kpis.lowStockProducts > 0" class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            Atención
          </span>
        </div>
        <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1" />
        <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ kpis.lowStockProducts }}</div>
        <p class="text-sm text-gray-500 font-medium">Productos Bajo Stock</p>
        <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-700"
            :style="{ width: Math.min(100, kpis.lowStockProducts * 10) + '%' }"
          />
        </div>
      </div>

      <!-- Clientes Nuevos -->
      <div class="card-premium p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
            <UserPlusIcon class="h-6 w-6 text-white" />
          </div>
          <span
            v-if="kpis.newCustomersChange !== null"
            class="text-xs font-semibold px-2 py-0.5 rounded-full"
            :class="kpis.newCustomersChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
          >
            {{ formatChange(kpis.newCustomersChange) }}
          </span>
        </div>
        <div v-if="loading" class="h-8 bg-gray-200 rounded animate-pulse mb-1" />
        <div v-else class="text-2xl font-black text-gray-900 mb-1">{{ kpis.newCustomers }}</div>
        <p class="text-sm text-gray-500 font-medium">Clientes Nuevos Hoy</p>
        <div class="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
            :style="{ width: Math.min(100, kpis.newCustomers * 8) + '%' }"
          />
        </div>
      </div>
    </div>

    <!-- Pedidos Activos + Acciones Rápidas -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Active Orders -->
      <div class="card-premium p-6 flex flex-col h-[600px]">
        <div class="flex items-center justify-between mb-6 flex-shrink-0">
          <div class="flex items-center">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
              <ShoppingCartIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Pedidos Activos</h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              {{ activeOrders.length }}
            </span>
            <button
              class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              :class="{ 'animate-spin': loading }"
              @click="loadDashboard"
              title="Actualizar"
            >
              <ArrowPathIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Loading skeleton -->
        <div v-if="loading && activeOrders.length === 0" class="space-y-3 flex-1">
          <div v-for="i in 3" :key="i" class="h-32 bg-gray-100 rounded-xl animate-pulse" />
        </div>

        <!-- Empty state -->
        <div v-else-if="!loading && activeOrders.length === 0" class="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
          <ShoppingCartIcon class="h-12 w-12 mb-3 opacity-30" />
          <p class="font-medium">No hay pedidos activos</p>
          <p class="text-sm mt-1">Los pedidos nuevos aparecerán aquí</p>
        </div>

        <!-- Order cards -->
        <div v-else class="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
          <OrderCard
            v-for="order in activeOrders"
            :key="order.id"
            :order="order"
            @view-details="openDetail"
            @status-change="handleStatusChange"
          />
        </div>

        <p v-if="lastUpdated" class="text-xs text-gray-400 text-right mt-2 flex-shrink-0">
          Actualizado {{ formatLastUpdated() }}
        </p>
      </div>

      <!-- Quick Actions -->
      <div class="card-premium p-6">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg mr-3">
            <CogIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">Acciones Rápidas</h3>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <NuxtLink to="/cliente-dashboard" class="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
            <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <ShoppingCartIcon class="relative h-6 w-6 mx-auto mb-2 transform group-hover:scale-110 transition-transform duration-300" />
            <span class="relative text-sm">Ver Pedidos</span>
          </NuxtLink>
          <NuxtLink to="/menu" class="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
            <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <DocumentTextIcon class="relative h-6 w-6 mx-auto mb-2 transform group-hover:scale-110 transition-transform duration-300" />
            <span class="relative text-sm">Gestionar Menú</span>
          </NuxtLink>
          <NuxtLink to="/inventario" class="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
            <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CubeIcon class="relative h-6 w-6 mx-auto mb-2 transform group-hover:scale-110 transition-transform duration-300" />
            <span class="relative text-sm">Ver Inventario</span>
          </NuxtLink>
          <NuxtLink to="/analytics" class="group relative overflow-hidden bg-gradient-to-br from-yellow-500 to-orange-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
            <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <ChartBarIcon class="relative h-6 w-6 mx-auto mb-2 transform group-hover:scale-110 transition-transform duration-300" />
            <span class="relative text-sm">Analytics</span>
          </NuxtLink>
          <NuxtLink to="/gastos" class="group relative overflow-hidden bg-gradient-to-br from-red-500 to-red-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
            <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CurrencyDollarIcon class="relative h-6 w-6 mx-auto mb-2 transform group-hover:scale-110 transition-transform duration-300" />
            <span class="relative text-sm">Control Gastos</span>
          </NuxtLink>
          <NuxtLink to="/delivery" class="group relative overflow-hidden bg-gradient-to-br from-teal-500 to-teal-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
            <div class="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <TruckIcon class="relative h-6 w-6 mx-auto mb-2 transform group-hover:scale-110 transition-transform duration-300" />
            <span class="relative text-sm">Delivery</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Performance Overview -->
    <div class="card-premium p-8">
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center">
          <div class="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg mr-3">
            <ChartPieIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-2xl font-bold text-gray-900">Resumen de Rendimiento</h3>
        </div>
        <div class="text-sm text-gray-500 font-medium">
          {{ lastUpdated ? `Actualizado ${formatLastUpdated()}` : 'Cargando…' }}
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Prep time -->
        <div class="text-center group">
          <div class="relative mb-4">
            <div class="absolute inset-0 bg-gradient-to-r from-workplace-red to-red-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            <div class="relative bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 transform group-hover:scale-105 transition-transform duration-300">
              <div v-if="loading" class="h-10 bg-red-200 rounded animate-pulse mx-auto w-24 mb-2" />
              <div v-else class="text-4xl font-black text-workplace-red mb-2">
                {{ kpis.avgPrepTime > 0 ? kpis.avgPrepTime + ' min' : '—' }}
              </div>
              <div class="text-sm font-semibold text-gray-600">Tiempo Promedio Preparación</div>
            </div>
          </div>
        </div>

        <!-- Customer satisfaction -->
        <div class="text-center group">
          <div class="relative mb-4">
            <div class="absolute inset-0 bg-gradient-to-r from-green-500 to-green-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            <div class="relative bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 transform group-hover:scale-105 transition-transform duration-300">
              <div v-if="loading" class="h-10 bg-green-200 rounded animate-pulse mx-auto w-24 mb-2" />
              <div v-else class="text-4xl font-black text-workplace-green mb-2">
                {{ kpis.customerSatisfaction > 0 ? kpis.customerSatisfaction.toFixed(1) + '%' : '—' }}
              </div>
              <div class="text-sm font-semibold text-gray-600">Tasa de Retención</div>
            </div>
          </div>
        </div>

        <!-- Delivery time -->
        <div class="text-center group">
          <div class="relative mb-4">
            <div class="absolute inset-0 bg-gradient-to-r from-workplace-orange to-orange-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            <div class="relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 transform group-hover:scale-105 transition-transform duration-300">
              <div v-if="loading" class="h-10 bg-orange-200 rounded animate-pulse mx-auto w-24 mb-2" />
              <div v-else class="text-4xl font-black text-workplace-orange mb-2">
                {{ kpis.avgDeliveryTime > 0 ? kpis.avgDeliveryTime + ' min' : '—' }}
              </div>
              <div class="text-sm font-semibold text-gray-600">Tiempo Promedio Entrega</div>
            </div>
          </div>
        </div>
      </div>
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
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  DocumentTextIcon,
  CubeIcon,
  ChartBarIcon,
  ChartPieIcon,
  CogIcon,
  TruckIcon,
  ArrowPathIcon,
} from '@heroicons/vue/24/outline'
import { useDashboard } from '~/composables/useDashboard'
import { type Order, type OrderStatus } from '~/composables/useClienteDashboard'
import OrderDetailModal from '~/components/modals/OrderDetailModal.vue'

// ── Clock ────────────────────────────────────────────────────────────────────
const currentTime = ref('')
let clockTimer: ReturnType<typeof setInterval>

onMounted(() => {
  const tick = () => {
    currentTime.value = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }
  tick()
  clockTimer = setInterval(tick, 1000)
})
onUnmounted(() => clearInterval(clockTimer))

// ── Dashboard data ────────────────────────────────────────────────────────────
const {
  kpis,
  activeOrders,
  loading,
  error,
  lastUpdated,
  loadDashboard,
  updateOrderStatus,
  markOrderPaid,
  formatCurrency,
  formatChange,
  formatLastUpdated,
} = useDashboard()

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = reactive({ visible: false, type: 'success' as 'success' | 'error' | 'warning' | 'info', message: '' })
let toastTimer: ReturnType<typeof setTimeout>

function showToast(type: typeof toast.type, message: string, duration = 3000) {
  clearTimeout(toastTimer)
  toast.type = type
  toast.message = message
  toast.visible = true
  toastTimer = setTimeout(() => { toast.visible = false }, duration)
}

// ── Order detail modal ────────────────────────────────────────────────────────
const showDetailModal = ref(false)
const selectedOrder   = ref<Order | null>(null)

function openDetail(order: Order) {
  selectedOrder.value = order
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  selectedOrder.value   = null
}

// ── Status transitions ────────────────────────────────────────────────────────
async function handleStatusChange(id: string, status: OrderStatus) {
  const ok = await updateOrderStatus(id, status)
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
    showToast(type, `Pedido actualizado: ${labels[status]}`)
    if (selectedOrder.value?.id === id) closeDetail()
  } else {
    showToast('error', error.value ?? 'Error al actualizar pedido', 4000)
  }
}

async function handleMarkPaid(id: string) {
  const ok = await markOrderPaid(id)
  if (ok) showToast('success', 'Pago registrado')
}

// ── Auto-refresh every 60s ────────────────────────────────────────────────────
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
