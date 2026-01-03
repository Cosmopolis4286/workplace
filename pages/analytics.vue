<template>
  <div>
    <PageHeader
      title="Analytics Dashboard"
      description="Análisis profundo del rendimiento de tu negocio"
      :icon="ChartBarIcon"
      :breadcrumb="breadcrumbItems"
      :stats="headerStats"
    >
      <template #actions>
        <button class="btn-secondary flex items-center">
          <AnalyticsArrowDownIcon class="h-5 w-5 mr-2" />
          Exportar
        </button>
        <button @click="showConfigModal = true" class="btn-primary flex items-center">
          <ChartBarIcon class="h-5 w-5 mr-2" />
          Configurar
        </button>
      </template>
    </PageHeader>

    <!-- Time Period Selector -->
    <div class="card p-6 mb-8">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700">Período:</label>
          <select v-model="selectedPeriod" class="input-field w-auto">
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="1y">Último año</option>
          </select>
        </div>
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700">Comparar con:</label>
          <select v-model="compareWith" class="input-field w-auto">
            <option value="previous">Período anterior</option>
            <option value="year">Año anterior</option>
            <option value="none">Sin comparación</option>
          </select>
        </div>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div class="card p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Ingresos Totales</p>
            <p class="text-3xl font-bold text-gray-900">$24,580</p>
            <div class="flex items-center mt-2">
              <AnalyticsArrowUpIcon class="h-4 w-4 text-green-600 mr-1" />
              <span class="text-sm text-green-600">+18.2% vs período anterior</span>
            </div>
          </div>
          <div class="p-3 bg-green-100 rounded-full">
            <CurrencyDollarIcon class="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Pedidos</p>
            <p class="text-3xl font-bold text-gray-900">1,247</p>
            <div class="flex items-center mt-2">
              <AnalyticsArrowUpIcon class="h-4 w-4 text-green-600 mr-1" />
              <span class="text-sm text-green-600">+12.5%</span>
            </div>
          </div>
          <div class="p-3 bg-blue-100 rounded-full">
            <ShoppingCartIcon class="h-8 w-8 text-blue-600" />
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Ticket Promedio</p>
            <p class="text-3xl font-bold text-gray-900">$19.71</p>
            <div class="flex items-center mt-2">
              <AnalyticsArrowUpIcon class="h-4 w-4 text-green-600 mr-1" />
              <span class="text-sm text-green-600">+5.1%</span>
            </div>
          </div>
          <div class="p-3 bg-yellow-100 rounded-full">
            <ReceiptPercentIcon class="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-gray-500">Conversión</p>
            <p class="text-3xl font-bold text-gray-900">3.2%</p>
            <div class="flex items-center mt-2">
              <AnalyticsArrowDownIcon class="h-4 w-4 text-red-600 mr-1" />
              <span class="text-sm text-red-600">-0.8%</span>
            </div>
          </div>
          <div class="p-3 bg-purple-100 rounded-full">
            <ChartBarIcon class="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Revenue Trend -->
      <div class="card p-4 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Tendencia de Ingresos</h3>
        <div class="h-64 sm:h-80">
          <LineChart :data="revenueChartData" />
        </div>
      </div>

      <!-- Orders by Hour -->
      <div class="card p-4 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Pedidos por Hora</h3>
        <div class="h-64 sm:h-80">
          <BarChart :data="ordersHourChartData" />
        </div>
      </div>

      <!-- Top Products -->
      <div class="card p-4 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Productos Más Vendidos</h3>
        <div class="h-64 sm:h-80">
          <BarChart :data="topProductsChartData" />
        </div>
      </div>

      <!-- Customer Segments -->
      <div class="card p-4 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Segmentos de Clientes</h3>
        <div class="h-64 sm:h-80">
          <DoughnutChart :data="customerSegmentsChartData" />
        </div>
      </div>
    </div>

    <!-- Detailed Analytics -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Performance Metrics -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Métricas de Rendimiento</h3>
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Tiempo Promedio de Preparación</span>
            <span class="font-medium">18 min</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Tiempo Promedio de Entrega</span>
            <span class="font-medium">32 min</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Tasa de Satisfacción</span>
            <span class="font-medium text-green-600">94.5%</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Pedidos Cancelados</span>
            <span class="font-medium text-red-600">2.1%</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Rating Promedio</span>
            <span class="font-medium">4.7 ⭐</span>
          </div>
        </div>
      </div>

      <!-- Growth Metrics -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Métricas de Crecimiento</h3>
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Nuevos Clientes (mes)</span>
            <span class="font-medium text-green-600">+89</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Tasa de Retención</span>
            <span class="font-medium">78.3%</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Valor de Vida del Cliente</span>
            <span class="font-medium">$156.80</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Frecuencia de Pedidos</span>
            <span class="font-medium">2.3/mes</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Costo de Adquisición</span>
            <span class="font-medium">$12.40</span>
          </div>
        </div>
      </div>

      <!-- Financial Health -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Salud Financiera</h3>
        <div class="space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Margen Bruto</span>
            <span class="font-medium text-green-600">68.5%</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Margen Neto</span>
            <span class="font-medium text-green-600">15.2%</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">ROI Marketing</span>
            <span class="font-medium text-green-600">4.2x</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Flujo de Caja</span>
            <span class="font-medium text-green-600">+$8,450</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-600">Punto de Equilibrio</span>
            <span class="font-medium">$18,200/mes</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Analytics Config Modal -->
    <AnalyticsConfigModal
      :is-open="showConfigModal"
      @close="showConfigModal = false"
      @save="saveAnalyticsConfig"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  ArrowUpIcon as AnalyticsArrowUpIcon,
  ArrowDownIcon as AnalyticsArrowDownIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ReceiptPercentIcon,
  ChartBarIcon
} from '@heroicons/vue/24/outline'
import LineChart from '~/components/charts/LineChart.vue'
import BarChart from '~/components/charts/BarChart.vue'
import DoughnutChart from '~/components/charts/DoughnutChart.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import AnalyticsConfigModal from '~/components/modals/AnalyticsConfigModal.vue'

definePageMeta({
  layout: 'default'
})

const selectedPeriod = ref('30d')
const compareWith = ref('previous')
const showConfigModal = ref(false)

const headerStats = ref([
  { label: 'Ingresos', value: '$24,580', change: '+18.2%', changeType: 'increase' },
  { label: 'Pedidos', value: '1,247', change: '+12.5%', changeType: 'increase' },
  { label: 'Ticket Promedio', value: '$19.71', change: '+5.1%', changeType: 'increase' },
  { label: 'Conversión', value: '3.2%', change: '-0.8%', changeType: 'decrease' }
])

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Analytics' }
])

const revenueChartData = computed(() => ({
  labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  datasets: [{
    label: 'Ingresos',
    data: [1200, 1900, 1500, 2100, 1800, 2400, 2200],
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    fill: true,
    tension: 0.4
  }]
}))

const ordersHourChartData = computed(() => ({
  labels: ['6h', '8h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'],
  datasets: [{
    label: 'Pedidos',
    data: [5, 12, 25, 45, 38, 42, 65, 58, 35],
    backgroundColor: '#3b82f6',
    borderRadius: 4
  }]
}))

const topProductsChartData = computed(() => ({
  labels: ['Pizza Margherita', 'Hamburguesa', 'Pasta Carbonara', 'Ensalada César', 'Tacos'],
  datasets: [{
    label: 'Ventas',
    data: [145, 98, 76, 65, 54],
    backgroundColor: [
      '#ef4444',
      '#f97316',
      '#eab308',
      '#22c55e',
      '#3b82f6'
    ],
    borderRadius: 4
  }]
}))

const customerSegmentsChartData = computed(() => ({
  labels: ['Nuevos', 'Recurrentes', 'VIP', 'Inactivos'],
  datasets: [{
    data: [35, 45, 15, 5],
    backgroundColor: [
      '#ef4444',
      '#f97316',
      '#eab308',
      '#6b7280'
    ],
    borderWidth: 0
  }]
}))

const saveAnalyticsConfig = (config) => {
  console.log('Analytics config saved:', config)
}
</script>