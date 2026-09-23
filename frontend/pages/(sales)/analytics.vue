<template>
  <div>
    <PageHeader
      title="Analytics Dashboard"
      :description="isPlatformAdmin
        ? 'Análisis agregado de toda la plataforma (todos los comercios y usuarios)'
        : isFreelancer ? 'Análisis profundo del rendimiento de tus servicios' : 'Análisis profundo del rendimiento de tu negocio'"
      :icon="ChartBarIcon"
      :breadcrumb="breadcrumbItems"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton :icon="AnalyticsArrowDownIcon" @click="exportReport">
          Exportar
        </HeaderActionButton>
        <HeaderActionButton variant="primary" :icon="ChartBarIcon" @click="showConfigModal = true">
          Configurar
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Time Period Selector -->
    <div class="card p-6 mb-8">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700">Período:</label>
          <select v-model="selectedPeriod" class="input-field w-auto" @change="reload">
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="1y">Último año</option>
          </select>
        </div>
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700">Comparar con:</label>
          <select v-model="compareWith" class="input-field w-auto" @change="reload">
            <option value="previous">Período anterior</option>
            <option value="year">Año anterior</option>
            <option value="none">Sin comparación</option>
          </select>
        </div>
        <div v-if="overview" class="ml-auto text-xs text-gray-400">
          {{ formatDateRange(overview.dateRange.from, overview.dateRange.to) }}
        </div>
      </div>
    </div>

    <!-- Error banner -->
    <div v-if="error" class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
      <span>{{ error }}</span>
      <button @click="reload" class="text-sm underline">Reintentar</button>
    </div>

    <!-- KPI Cards skeleton -->
    <div v-if="loading && !overview" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div v-for="i in 4" :key="i" class="card p-6 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
        <div class="h-8 bg-gray-200 rounded w-1/2 mb-3"></div>
        <div class="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        :title="isPlatformAdmin ? 'GMV Plataforma' : 'Ingresos Totales'"
        :value="overview ? formatCurrency(overview.kpis.totalRevenue) : '—'"
        :icon="CurrencyDollarIcon"
        variant="success"
        :change="overview?.kpis.totalRevenueChange ?? null"
        :period="compareWith !== 'none' ? 'vs anterior' : undefined"
      />
      <StatsCard
        :title="isPlatformAdmin ? 'Pedidos (todos)' : isFreelancer ? 'Solicitudes' : 'Pedidos'"
        :value="overview ? formatNumber(overview.kpis.totalOrders) : '—'"
        :icon="ShoppingCartIcon"
        variant="info"
        :change="overview?.kpis.totalOrdersChange ?? null"
      />
      <StatsCard
        title="Ticket Promedio"
        :value="overview ? formatCurrency(overview.kpis.avgTicket) : '—'"
        :icon="ReceiptPercentIcon"
        variant="warning"
        :change="overview?.kpis.avgTicketChange ?? null"
      />
      <StatsCard
        :title="isPlatformAdmin ? 'Nuevos Usuarios' : 'Nuevos Clientes'"
        :value="overview ? formatNumber(overview.kpis.newCustomers) : '—'"
        :icon="UsersIcon"
        variant="purple"
        :change="overview?.kpis.newCustomersChange ?? null"
      />
    </div>

    <!-- Charts Grid skeleton -->
    <div v-if="loading && !overview" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div v-for="i in 4" :key="i" class="card p-6 animate-pulse">
        <div class="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div class="h-64 bg-gray-100 rounded"></div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div v-else-if="overview" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Revenue Trend -->
      <div class="card p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">Tendencia de Ingresos</h3>
          <span v-if="loading" class="text-xs text-gray-400 animate-pulse">Actualizando…</span>
        </div>
        <div class="h-64 sm:h-80">
          <LineChart v-if="revenueChartData" :data="revenueChartData" />
          <EmptyChart v-else label="Sin datos de ingresos" />
        </div>
      </div>

      <!-- Orders/Requests by Hour -->
      <div class="card p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">{{ isFreelancer ? 'Solicitudes por Hora' : 'Pedidos por Hora' }}</h3>
        </div>
        <div class="h-64 sm:h-80">
          <BarChart v-if="ordersHourChartData" :data="ordersHourChartData" />
          <EmptyChart v-else :label="isFreelancer ? 'Sin datos de solicitudes' : 'Sin datos de pedidos'" />
        </div>
      </div>

      <!-- Top Products/Services -->
      <div class="card p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">{{ isPlatformAdmin ? 'Productos Más Vendidos (plataforma)' : isFreelancer ? 'Servicios Más Solicitados' : 'Productos Más Vendidos' }}</h3>
        </div>
        <div class="h-64 sm:h-80">
          <BarChart v-if="topProductsChartData" :data="topProductsChartData" />
          <EmptyChart v-else :label="isFreelancer ? 'Sin servicios registrados' : 'Sin productos registrados'" />
        </div>
      </div>

      <!-- Customer Segments: no aplica a freelancers (no hay modelo Customer con segmentación) -->
      <div v-if="!isFreelancer" class="card p-4 sm:p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-medium text-gray-900">{{ isPlatformAdmin ? 'Segmentos de Clientes (plataforma)' : 'Segmentos de Clientes' }}</h3>
        </div>
        <div class="h-64 sm:h-80">
          <DoughnutChart v-if="customerSegmentsChartData" :data="customerSegmentsChartData" />
          <EmptyChart v-else label="Sin clientes registrados" />
        </div>
      </div>
    </div>

    <!-- Detailed Analytics -->
    <div v-if="overview" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Performance Metrics -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Métricas de Rendimiento</h3>
        <div class="space-y-4">
          <MetricRow
            v-if="!isFreelancer"
            label="Tiempo Promedio de Preparación"
            :value="overview.performance.operational.avgPrepTime
              ? `${overview.performance.operational.avgPrepTime} min` : '—'"
          />
          <MetricRow
            :label="isFreelancer ? 'Tiempo Promedio de Respuesta' : 'Tiempo Promedio de Entrega'"
            :value="overview.performance.operational.avgDeliveryTime
              ? `${overview.performance.operational.avgDeliveryTime} min` : '—'"
          />
          <MetricRow
            label="Tasa de Cancelación"
            :value="`${overview.performance.operational.cancellationRate}%`"
            :value-class="overview.performance.operational.cancellationRate > 10 ? 'text-red-600' : 'text-green-600'"
          />
          <MetricRow
            :label="isFreelancer ? 'Solicitudes en el Período' : 'Pedidos en el Período'"
            :value="formatNumber(overview.performance.operational.totalInPeriod)"
          />
          <MetricRow
            :label="isFreelancer ? 'Solicitudes Canceladas' : 'Pedidos Cancelados'"
            :value="formatNumber(overview.performance.operational.cancellations)"
            :value-class="overview.performance.operational.cancellations > 0 ? 'text-red-600' : 'text-gray-900'"
          />
        </div>
      </div>

      <!-- Growth Metrics -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Métricas de Crecimiento</h3>
        <div class="space-y-4">
          <MetricRow
            label="Nuevos Clientes (período)"
            :value="`+${overview.performance.growth.newCustomers}`"
            value-class="text-green-600"
          />
          <MetricRow
            label="Tasa de Retención"
            :value="`${overview.performance.growth.retentionRate}%`"
            :value-class="overview.performance.growth.retentionRate >= 60 ? 'text-green-600' : 'text-yellow-600'"
          />
          <MetricRow
            label="Valor de Vida del Cliente (CLV)"
            :value="formatCurrency(overview.performance.growth.clv)"
          />
          <MetricRow
            :label="isFreelancer ? 'Frecuencia de Solicitudes' : 'Frecuencia de Pedidos'"
            :value="`${overview.performance.growth.orderFrequency}/hist.`"
          />
          <MetricRow
            label="Total de Clientes"
            :value="formatNumber(overview.performance.growth.totalCustomers)"
          />
        </div>
      </div>

      <!-- Financial Health -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Salud Financiera</h3>
        <div class="space-y-4">
          <MetricRow
            v-if="isPlatformAdmin"
            label="Comercios Activos"
            :value="formatNumber(overview.performance.financial.activeCommerces ?? 0)"
          />
          <MetricRow
            v-if="!isFreelancer"
            :label="isPlatformAdmin ? 'Margen Bruto (promedio plataforma)' : 'Margen Bruto (promedio)'"
            :value="`${overview.performance.financial.grossMargin}%`"
            :value-class="overview.performance.financial.grossMargin >= 50 ? 'text-green-600' : 'text-yellow-600'"
          />
          <MetricRow
            label="Ticket Promedio"
            :value="formatCurrency(overview.performance.financial.avgTicket)"
          />
          <MetricRow
            label="Ingresos del Período"
            :value="formatCurrency(overview.performance.financial.totalRevenue)"
            value-class="text-green-600"
          />
          <MetricRow
            :label="isFreelancer ? 'Total de Solicitudes Cerradas' : 'Total de Pedidos'"
            :value="formatNumber(overview.performance.financial.totalOrders)"
          />
          <MetricRow
            :label="isFreelancer ? 'Ingreso por Solicitud' : 'Ingreso por Pedido'"
            :value="overview.performance.financial.totalOrders > 0
              ? formatCurrency(overview.performance.financial.totalRevenue / overview.performance.financial.totalOrders)
              : '—'"
          />
        </div>
      </div>
    </div>

    <!-- Empty state (no data, no error) -->
    <div v-else-if="!loading && !error" class="card p-12 text-center text-gray-400">
      <ChartBarIcon class="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p class="text-lg font-medium">Sin datos analíticos</p>
      <p class="text-sm mt-1">Agrega clientes, productos y agendamientos para ver tus métricas.</p>
    </div>

    <!-- Analytics Config Modal -->
    <AnalyticsConfigModal
      :is-open="showConfigModal"
      @close="showConfigModal = false"
      @save="saveAnalyticsConfig"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import {
  ArrowDownIcon as AnalyticsArrowDownIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ReceiptPercentIcon,
  ChartBarIcon,
  UsersIcon,
} from '@heroicons/vue/24/outline'
import LineChart from '~/components/charts/LineChart.vue'
import BarChart from '~/components/charts/BarChart.vue'
import DoughnutChart from '~/components/charts/DoughnutChart.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import StatsCard from '~/components/shared/StatsCard.vue'
import AnalyticsConfigModal from '~/components/modals/AnalyticsConfigModal.vue'
import type { AnalyticsPeriod, CompareWith } from '~/composables/dashboard/useAnalytics'
import { useDateFormat } from '~/composables/core/useDateFormat'

// ─── Inline micro-components ─────────────────────────────────────────────────

const MetricRow = defineComponent({
  props: {
    label: String,
    value: String,
    valueClass: { type: String, default: 'font-medium' },
  },
  template: `
    <div class="flex justify-between items-center">
      <span class="text-sm text-gray-600">{{ label }}</span>
      <span :class="['font-medium', valueClass]">{{ value }}</span>
    </div>
  `,
})

const EmptyChart = defineComponent({
  props: { label: String },
  template: `
    <div class="h-full flex items-center justify-center text-gray-300 text-sm">{{ label }}</div>
  `,
})

// ─── State ────────────────────────────────────────────────────────────────────

const selectedPeriod = ref<AnalyticsPeriod>('30d')
const compareWith = ref<CompareWith>('previous')
const showConfigModal = ref(false)

const {
  overview,
  loading,
  error,
  revenueChartData,
  ordersHourChartData,
  topProductsChartData,
  customerSegmentsChartData,
  headerStats,
  formatCurrency,
  formatChange,
  exportReport,
  loadOverview,
} = useAnalytics()

// Un freelancer no vende productos con stock/preparación/entrega: vende
// servicios vía solicitudes (ServiceRequest). El backend ya devuelve el
// mismo contrato de datos remapeado; acá solo se ajustan los textos.
// role=PROFESIONAL ya no distingue COMMERCE de FREELANCER — accountType
// (resuelto por el backend) es la fuente real.
const { user } = useAuth()
const isFreelancer = computed(() => user.value?.accountType === 'FREELANCER')

// SUPERADMIN/ADMIN no tienen un comercio propio: el backend
// (PlatformAnalyticsStrategy) les agrega los mismos campos del contrato
// pero sobre TODA la plataforma (todos los comercios/usuarios), no "mi
// negocio" — acá solo se ajustan los textos para reflejar eso.
const isPlatformAdmin = computed(() => user.value?.role === 'SUPERADMIN' || user.value?.role === 'ADMIN')

const { formatDate, formatNumber } = useDateFormat()

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Analytics' },
])

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`
}

function reload() {
  loadOverview(selectedPeriod.value, compareWith.value)
}

function saveAnalyticsConfig(config: unknown) {
  const saved = config as { period?: AnalyticsPeriod; compareWith?: CompareWith }
  if (saved.period) selectedPeriod.value = saved.period
  if (saved.compareWith) compareWith.value = saved.compareWith
  reload()
}

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(() => {
  loadOverview(selectedPeriod.value, compareWith.value)
})
</script>
