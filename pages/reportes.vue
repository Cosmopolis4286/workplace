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
        <button class="btn-secondary flex items-center">
          <CalendarIcon class="h-5 w-5 mr-2" />
          Filtrar Fecha
        </button>
        <button class="btn-primary flex items-center">
          <ArrowDownTrayIcon class="h-5 w-5 mr-2" />
          Exportar
        </button>
      </template>
    </PageHeader>

    <!-- Date Range Selector -->
    <div class="card p-6 mb-8">
      <div class="flex flex-wrap items-center gap-4">
        <div class="flex items-center space-x-2">
          <label class="text-sm font-medium text-gray-700">Período:</label>
          <select v-model="selectedPeriod" class="input-field w-auto">
            <option value="today">Hoy</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mes</option>
            <option value="quarter">Este Trimestre</option>
            <option value="year">Este Año</option>
            <option value="custom">Personalizado</option>
          </select>
        </div>
        
        <div v-if="selectedPeriod === 'custom'" class="flex items-center space-x-2">
          <input type="date" v-model="startDate" class="input-field w-auto">
          <span class="text-gray-500">a</span>
          <input type="date" v-model="endDate" class="input-field w-auto">
        </div>
      </div>
    </div>

    <!-- Key Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Ingresos Totales"
        value="$24,580"
        :icon="CurrencyDollarIcon"
        change="+18%"
        changeType="increase"
        variant="primary"
      />
      <StatsCard
        title="Pedidos Totales"
        value="342"
        :icon="ShoppingCartIcon"
        change="+12%"
        changeType="increase"
        variant="success"
      />
      <StatsCard
        title="Ticket Promedio"
        value="$71.87"
        :icon="ReceiptPercentIcon"
        change="+5%"
        changeType="increase"
        variant="warning"
      />
      <StatsCard
        title="Nuevos Clientes"
        value="89"
        :icon="UserPlusIcon"
        change="+23%"
        changeType="increase"
        variant="secondary"
      />
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <!-- Revenue Chart -->
      <div class="card p-4 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Ingresos por Día</h3>
        <div class="h-64 sm:h-80">
          <LineChart :data="revenueChartData" />
        </div>
      </div>

      <!-- Orders Chart -->
      <div class="card p-4 sm:p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Pedidos por Hora</h3>
        <div class="h-64 sm:h-80">
          <BarChart :data="ordersChartData" />
        </div>
      </div>
    </div>

    <!-- Detailed Reports -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Top Products -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Productos Más Vendidos</h3>
        <div class="space-y-4">
          <div v-for="product in topProducts" :key="product.id" class="flex items-center justify-between">
            <div class="flex items-center">
              <img :src="product.image" :alt="product.name" class="h-10 w-10 rounded-lg object-cover">
              <div class="ml-3">
                <p class="text-sm font-medium text-gray-900">{{ product.name }}</p>
                <p class="text-xs text-gray-500">{{ product.sold }} vendidos</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-sm font-medium text-gray-900">${{ product.revenue }}</p>
              <div class="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                <div 
                  class="bg-ifood-red h-1.5 rounded-full" 
                  :style="{ width: `${product.percentage}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer Insights -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Insights de Clientes</h3>
        <div class="space-y-4">
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">Clientes Nuevos</span>
              <span class="text-lg font-bold text-ifood-red">89</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-ifood-red h-2 rounded-full" style="width: 75%"></div>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">Clientes Recurrentes</span>
              <span class="text-lg font-bold text-ifood-orange">156</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-ifood-orange h-2 rounded-full" style="width: 85%"></div>
            </div>
          </div>
          
          <div class="bg-gray-50 p-4 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium text-gray-700">Clientes VIP</span>
              <span class="text-lg font-bold text-ifood-yellow">23</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
              <div class="bg-ifood-yellow h-2 rounded-full" style="width: 45%"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Métricas de Rendimiento</h3>
        <div class="space-y-4">
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Tiempo Promedio de Preparación</span>
            <span class="font-medium text-gray-900">18 min</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Tiempo Promedio de Entrega</span>
            <span class="font-medium text-gray-900">32 min</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Tasa de Satisfacción</span>
            <span class="font-medium text-ifood-green">94.5%</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-100">
            <span class="text-sm text-gray-600">Pedidos Cancelados</span>
            <span class="font-medium text-red-600">2.1%</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-sm text-gray-600">Rating Promedio</span>
            <span class="font-medium text-ifood-yellow">4.7 ⭐</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { 
  CalendarIcon,
  ArrowDownTrayIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ReceiptPercentIcon,
  UserPlusIcon,
  ChartBarIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'
import StatsCard from '~/components/StatsCard.vue'
import LineChart from '~/components/charts/LineChart.vue'
import BarChart from '~/components/charts/BarChart.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
const selectedPeriod = ref('month')
const startDate = ref('')
const endDate = ref('')

const headerStats = ref([
  { label: 'Ingresos', value: '$24,580', change: '+18%', changeType: 'increase' },
  { label: 'Pedidos', value: '342', change: '+12%', changeType: 'increase' },
  { label: 'Ticket Promedio', value: '$71.87', change: '+5%', changeType: 'increase' },
  { label: 'Nuevos Clientes', value: '89', change: '+23%', changeType: 'increase' }
])

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Reportes' }
])

const topProducts = ref([
  {
    id: 1,
    name: 'Pizza Margherita',
    sold: 145,
    revenue: '2,319.55',
    percentage: 85,
    image: 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop'
  },
  {
    id: 2,
    name: 'Hamburguesa Clásica',
    sold: 98,
    revenue: '1,225.00',
    percentage: 65,
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop'
  },
  {
    id: 3,
    name: 'Pasta Carbonara',
    sold: 76,
    revenue: '912.00',
    percentage: 55,
    image: 'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop'
  }
])

const revenueChartData = computed(() => ({
  labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  datasets: [{
    label: 'Ingresos Diarios',
    data: [1200, 1900, 1500, 2100, 1800, 2400, 2200],
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    fill: true,
    tension: 0.4
  }]
}))

const ordersChartData = computed(() => ({
  labels: ['6h', '8h', '10h', '12h', '14h', '16h', '18h', '20h', '22h'],
  datasets: [{
    label: 'Pedidos por Hora',
    data: [5, 12, 25, 45, 38, 42, 65, 58, 35],
    backgroundColor: '#f97316',
    borderRadius: 4
  }]
}))
</script>