<template>
  <div>
    <PageHeader
      title="Reportes"
      description="Análisis detallado del rendimiento de tu negocio"
      :icon="ChartBarIcon"
      :breadcrumb="breadcrumbItems"
      :stats="headerStats"
    >
      <template #actions>
        <button class="btn-secondary flex items-center" @click="showFilters = !showFilters">
          <FunnelIcon class="h-5 w-5 mr-2" />
          Filtros
        </button>
        <button class="btn-primary flex items-center" :disabled="!overview" @click="exportReport">
          <ArrowDownTrayIcon class="h-5 w-5 mr-2" />
          Exportar
        </button>
      </template>
    </PageHeader>

    <!-- Filters Panel -->
    <div v-if="showFilters" class="card p-6 mb-8">
      <div class="flex flex-wrap items-end gap-4">
        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Período</label>
          <select v-model="selectedPeriod" class="input-field w-auto" @change="onPeriodChange">
            <option v-for="(label, key) in PERIOD_LABELS" :key="key" :value="key">{{ label }}</option>
          </select>
        </div>

        <template v-if="selectedPeriod === 'custom'">
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Desde</label>
            <input type="date" v-model="customFrom" class="input-field w-auto" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Hasta</label>
            <input type="date" v-model="customTo" class="input-field w-auto" />
          </div>
        </template>

        <div class="flex flex-col gap-1">
          <label class="text-xs font-medium text-gray-500 uppercase tracking-wide">Comparar con</label>
          <select v-model="selectedCompare" class="input-field w-auto">
            <option value="previous">Período anterior</option>
            <option value="year">Mismo período año anterior</option>
            <option value="none">Sin comparación</option>
          </select>
        </div>

        <button
          class="btn-primary flex items-center self-end"
          :disabled="loading || (selectedPeriod === 'custom' && (!customFrom || !customTo))"
          @click="applyFilters"
        >
          <ArrowPathIcon v-if="loading" class="h-4 w-4 mr-2 animate-spin" />
          <MagnifyingGlassIcon v-else class="h-4 w-4 mr-2" />
          Aplicar
        </button>
      </div>

      <p v-if="overview" class="mt-3 text-xs text-gray-500">
        <CalendarIcon class="h-3.5 w-3.5 inline mr-1 -mt-0.5" />
        {{ formatDateRange(overview.dateRange.from, overview.dateRange.to) }}
        <span v-if="overview.previousDateRange" class="ml-2 text-gray-400">
          vs. {{ formatDateRange(overview.previousDateRange.from, overview.previousDateRange.to) }}
        </span>
      </p>
    </div>

    <!-- Error Banner -->
    <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-8 flex items-center gap-3">
      <ExclamationTriangleIcon class="h-5 w-5 flex-shrink-0" />
      <span class="text-sm">{{ error }}</span>
      <button class="ml-auto text-red-500 hover:text-red-700" @click="applyFilters">
        <ArrowPathIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Key Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <template v-if="loading">
        <div v-for="i in 4" :key="i" class="card p-6 animate-pulse">
          <div class="h-4 bg-gray-200 rounded w-2/3 mb-3"></div>
          <div class="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div class="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </template>
      <template v-else-if="overview">
        <StatsCard
          title="Ingresos Totales"
          :value="formatCurrency(overview.kpis.totalRevenue)"
          :icon="CurrencyDollarIcon"
          :change="formatChange(overview.kpis.totalRevenueChange)"
          :changeType="kpiChangeType(overview.kpis.totalRevenueChange)"
          variant="primary"
        />
        <StatsCard
          title="Pedidos Totales"
          :value="overview.kpis.totalOrders.toLocaleString('es-MX')"
          :icon="ShoppingCartIcon"
          :change="formatChange(overview.kpis.totalOrdersChange)"
          :changeType="kpiChangeType(overview.kpis.totalOrdersChange)"
          variant="success"
        />
        <StatsCard
          title="Ticket Promedio"
          :value="formatCurrency(overview.kpis.avgTicket)"
          :icon="ReceiptPercentIcon"
          :change="formatChange(overview.kpis.avgTicketChange)"
          :changeType="kpiChangeType(overview.kpis.avgTicketChange)"
          variant="warning"
        />
        <StatsCard
          title="Nuevos Clientes"
          :value="overview.kpis.newCustomers.toLocaleString('es-MX')"
          :icon="UserPlusIcon"
          :change="formatChange(overview.kpis.newCustomersChange)"
          :changeType="kpiChangeType(overview.kpis.newCustomersChange)"
          variant="secondary"
        />
      </template>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Revenue Chart -->
      <div class="card p-4 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          {{ selectedPeriod === 'today' ? 'Ingresos por Hora' : 'Ingresos por Día' }}
        </h3>
        <div class="h-64 sm:h-80">
          <div v-if="loading" class="h-full bg-gray-100 rounded-lg animate-pulse"></div>
          <LineChart v-else-if="revenueChartData" :data="revenueChartData" />
          <EmptyChart v-else />
        </div>
      </div>

      <!-- Orders by Hour Chart -->
      <div class="card p-4 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Pedidos por Hora del Día</h3>
        <div class="h-64 sm:h-80">
          <div v-if="loading" class="h-full bg-gray-100 rounded-lg animate-pulse"></div>
          <BarChart v-else-if="ordersHourChartData" :data="ordersHourChartData" />
          <EmptyChart v-else />
        </div>
      </div>
    </div>

    <!-- Detailed Reports Row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      <!-- Top Products -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Productos Más Vendidos</h3>

        <template v-if="loading">
          <div v-for="i in 5" :key="i" class="flex items-center gap-3 mb-4 animate-pulse">
            <div class="h-10 w-10 bg-gray-200 rounded-lg flex-shrink-0"></div>
            <div class="flex-1">
              <div class="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div class="h-2 bg-gray-200 rounded w-full"></div>
            </div>
            <div class="h-3 bg-gray-200 rounded w-12"></div>
          </div>
        </template>

        <div v-else-if="topProductsList.length" class="space-y-4">
          <div
            v-for="(product, idx) in topProductsList"
            :key="product.name"
            class="flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span
                class="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                :class="rankColor(idx)"
              >{{ idx + 1 }}</span>
              <div class="min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">{{ product.name }}</p>
                <p class="text-xs text-gray-500">{{ product.sold }} uds. vendidas</p>
              </div>
            </div>
            <div class="text-right flex-shrink-0">
              <p class="text-sm font-semibold text-gray-900">{{ formatCurrency(product.revenue) }}</p>
              <div class="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  class="bg-ifood-red h-1.5 rounded-full transition-all duration-500"
                  :style="{ width: `${product.percentage}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <p v-else class="text-sm text-gray-500 text-center py-8">Sin datos de productos</p>
      </div>

      <!-- Customer Insights -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Segmentos de Clientes</h3>

        <div v-if="loading" class="h-48 bg-gray-100 rounded-lg animate-pulse mb-4"></div>
        <div v-else-if="customerSegmentsChartData" class="h-48 mb-4">
          <DoughnutChart :data="customerSegmentsChartData" />
        </div>

        <template v-if="!loading && overview">
          <div class="space-y-2 mt-4">
            <div
              v-for="(seg, idx) in segmentRows"
              :key="seg.label"
              class="flex items-center justify-between"
            >
              <div class="flex items-center gap-2">
                <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: seg.color }"></span>
                <span class="text-sm text-gray-700">{{ seg.label }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-gray-900">{{ seg.count }}</span>
                <span class="text-xs text-gray-400">{{ seg.pct }}%</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Performance Metrics -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Métricas de Rendimiento</h3>

        <template v-if="loading">
          <div v-for="i in 6" :key="i" class="flex justify-between py-2 border-b border-gray-100 animate-pulse">
            <div class="h-3 bg-gray-200 rounded w-1/2"></div>
            <div class="h-3 bg-gray-200 rounded w-1/5"></div>
          </div>
        </template>

        <template v-else-if="overview">
          <div class="space-y-0">
            <!-- Operational -->
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Operacional</p>
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Tiempo Promedio Preparación</span>
              <span class="font-medium text-gray-900">{{ overview.performance.operational.avgPrepTime || '—' }} min</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Tiempo Promedio Entrega</span>
              <span class="font-medium text-gray-900">{{ overview.performance.operational.avgDeliveryTime || '—' }} min</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Tasa Cancelación</span>
              <span
                class="font-medium"
                :class="overview.performance.operational.cancellationRate > 5 ? 'text-red-600' : 'text-green-600'"
              >{{ overview.performance.operational.cancellationRate }}%</span>
            </div>

            <!-- Growth -->
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">Crecimiento</p>
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Tasa de Retención</span>
              <span class="font-medium text-ifood-green">{{ overview.performance.growth.retentionRate }}%</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Valor de Vida Cliente</span>
              <span class="font-medium text-gray-900">{{ formatCurrency(overview.performance.growth.clv) }}</span>
            </div>
            <div class="flex justify-between items-center py-2 border-b border-gray-100">
              <span class="text-sm text-gray-600">Frecuencia de Pedidos</span>
              <span class="font-medium text-gray-900">{{ overview.performance.growth.orderFrequency }}x</span>
            </div>

            <!-- Financial -->
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 mt-4">Financiero</p>
            <div class="flex justify-between items-center py-2">
              <span class="text-sm text-gray-600">Margen Bruto Promedio</span>
              <span
                class="font-medium"
                :class="overview.performance.financial.grossMargin >= 50 ? 'text-green-600' : 'text-yellow-600'"
              >{{ overview.performance.financial.grossMargin }}%</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Top Products Bar Chart (full width) -->
    <div v-if="topProductsChartData" class="card p-4 sm:p-6">
      <h3 class="text-lg font-medium text-gray-900 mb-4">Comparativa de Productos Más Vendidos</h3>
      <div class="h-64">
        <div v-if="loading" class="h-full bg-gray-100 rounded-lg animate-pulse"></div>
        <BarChart v-else :data="topProductsChartData" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ReceiptPercentIcon,
  UserPlusIcon,
  FunnelIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import StatsCard from '~/components/StatsCard.vue'
import LineChart from '~/components/charts/LineChart.vue'
import BarChart from '~/components/charts/BarChart.vue'
import DoughnutChart from '~/components/charts/DoughnutChart.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import {
  useAnalytics,
  PERIOD_LABELS,
  type AnalyticsPeriod,
  type CompareWith,
} from '~/composables/useAnalytics'

const {
  overview,
  loading,
  error,
  revenueChartData,
  ordersHourChartData,
  topProductsChartData,
  customerSegmentsChartData,
  topProductsList,
  headerStats,
  formatCurrency,
  formatChange,
  formatDateRange,
  loadOverview,
  exportReport,
} = useAnalytics()

// ─── Local state ─────────────────────────────────────────────────────────────
const showFilters = ref(true)
const selectedPeriod = ref<AnalyticsPeriod>('30d')
const selectedCompare = ref<CompareWith>('previous')
const customFrom = ref('')
const customTo = ref('')

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Reportes' },
])

// ─── Segment colors matching DoughnutChart ────────────────────────────────────
const SEGMENT_COLORS = ['#eab308', '#f97316', '#6b7280', '#ef4444']

const segmentRows = computed(() => {
  if (!overview.value) return []
  const { labels, values } = overview.value.customerSegments
  const total = values.reduce((a, b) => a + b, 0)
  return labels.map((label, i) => ({
    label,
    count: values[i],
    color: SEGMENT_COLORS[i] ?? '#94a3b8',
    pct: total > 0 ? Math.round((values[i] / total) * 100) : 0,
  }))
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function kpiChangeType(pct: number | null): 'increase' | 'decrease' | 'neutral' {
  if (pct === null) return 'neutral'
  return pct >= 0 ? 'increase' : 'decrease'
}

function rankColor(idx: number): string {
  const colors = ['bg-yellow-500', 'bg-gray-400', 'bg-amber-600', 'bg-blue-500', 'bg-green-500']
  return colors[idx] ?? 'bg-gray-300'
}

// ─── EmptyChart inline component ─────────────────────────────────────────────
const EmptyChart = defineComponent({
  render() {
    return h('div', { class: 'h-full flex items-center justify-center text-gray-400 text-sm' }, 'Sin datos')
  },
})

// ─── Actions ─────────────────────────────────────────────────────────────────
function onPeriodChange() {
  if (selectedPeriod.value !== 'custom') {
    applyFilters()
  }
}

function applyFilters() {
  loadOverview(
    selectedPeriod.value,
    selectedCompare.value,
    selectedPeriod.value === 'custom' ? customFrom.value : undefined,
    selectedPeriod.value === 'custom' ? customTo.value : undefined,
  )
}

// ─── Init ─────────────────────────────────────────────────────────────────────
onMounted(() => {
  loadOverview(selectedPeriod.value, selectedCompare.value)
})
</script>
