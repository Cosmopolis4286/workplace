<template>
  <div>
    <PageHeader
      title="Gestión de Ventas"
      description="Control completo de pedidos y transacciones"
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
          Nueva Venta
        </button>
      </template>
    </PageHeader>

    <!-- Sales Content -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Sales List -->
      <div class="lg:col-span-2">
        <div class="card p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Ventas Recientes</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p class="font-medium text-gray-900">#001234</p>
                <p class="text-sm text-gray-500">Mesa 5 - 14:30</p>
              </div>
              <div class="text-right">
                <p class="font-medium text-gray-900">$45.80</p>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Completado
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
            Nueva Venta
          </button>
          <button class="w-full btn-secondary">
            Ver Reportes
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
const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Ventas' }
])

const headerStats = ref([
  { label: 'Ventas Hoy', value: '$2,450', change: '+12.5%', changeType: 'increase' },
  { label: 'Pedidos Hoy', value: '89', change: '+8.2%', changeType: 'increase' },
  { label: 'Ticket Promedio', value: '$27.53', change: '+3.1%', changeType: 'increase' },
  { label: 'Productos Vendidos', value: '234', change: '+15.7%', changeType: 'increase' }
])
</script>