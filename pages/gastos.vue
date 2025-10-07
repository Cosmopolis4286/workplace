<template>
  <div>
    <PageHeader
      title="Control de Gastos"
      description="Gestión completa de gastos y presupuestos empresariales"
      :icon="CurrencyDollarIcon"
      :breadcrumb="breadcrumbItems"
      :stats="headerStats"
    >
      <template #actions>
        <button class="btn-secondary flex items-center">
          <ArrowDownIcon class="h-5 w-5 mr-2" />
          Exportar
        </button>
        <button class="btn-primary flex items-center">
          <PlusIcon class="h-5 w-5 mr-2" />
          Nuevo Gasto
        </button>
      </template>
    </PageHeader>

    <!-- Expenses Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Expenses List -->
      <div class="lg:col-span-2">
        <div class="card p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Gastos Recientes</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p class="font-medium text-gray-900">Compra de Ingredientes</p>
                <p class="text-sm text-gray-500">15 Ene 2024 - 10:30</p>
              </div>
              <div class="text-right">
                <p class="font-medium text-gray-900">$450.00</p>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Pendiente
                </span>
              </div>
            </div>
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p class="font-medium text-gray-900">Servicios Públicos</p>
                <p class="text-sm text-gray-500">14 Ene 2024 - 16:45</p>
              </div>
              <div class="text-right">
                <p class="font-medium text-gray-900">$180.50</p>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Pagado
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
        <div class="space-y-3">
          <button class="w-full btn-primary">
            Nuevo Gasto
          </button>
          <button class="w-full btn-secondary">
            Ver Presupuesto
          </button>
          <button class="w-full btn-secondary">
            Generar Reporte
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { 
  CurrencyDollarIcon,
  ArrowDownIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'

definePageMeta({
  layout: 'default'
})

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Control de Gastos' }
])

const headerStats = ref([
  { label: 'Total Mensual', value: '$8,450', change: '+15.2%', changeType: 'increase' },
  { label: 'Pendientes', value: '$1,250', change: '-8.5%', changeType: 'decrease' },
  { label: 'Pagados', value: '$7,200', change: '+22.1%', changeType: 'increase' },
  { label: 'Promedio Diario', value: '$280', change: '+5.3%', changeType: 'increase' }
])
</script>