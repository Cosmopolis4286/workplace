<template>
  <div>
    <PageHeader
      title="Configuración"
      description="Personaliza tu experiencia y gestiona las opciones del sistema"
      :icon="CogIcon"
    />

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="card-premium p-6">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
            <BuildingStorefrontIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">Información del Restaurante</h3>
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Nombre del Restaurante</label>
            <input
              v-model="restaurantData.name"
              type="text"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            >
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
            <input
              v-model="restaurantData.address"
              type="text"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            >
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
              <input
                v-model="restaurantData.phone"
                type="tel"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
              >
            </div>

            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                v-model="restaurantData.email"
                type="email"
                class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Horario de Atención</label>
            <textarea
              v-model="restaurantData.schedule"
              rows="3"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            ></textarea>
          </div>

          <button
            @click="saveRestaurantData"
            class="w-full px-6 py-3 bg-gradient-to-r from-ifood-red to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Guardar Información
          </button>
        </div>
      </div>

      <div class="card-premium p-6">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg mr-3">
            <BellIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">Notificaciones</h3>
        </div>

        <div class="space-y-4">
          <div v-for="notification in notificationSettings" :key="notification.id" class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors duration-200">
            <div>
              <div class="font-semibold text-gray-900">{{ notification.title }}</div>
              <div class="text-sm text-gray-500">{{ notification.description }}</div>
            </div>
            <button
              @click="toggleNotification(notification.id)"
              :class="[
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300',
                notification.enabled ? 'bg-ifood-red' : 'bg-gray-300'
              ]"
            >
              <span
                :class="[
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300',
                  notification.enabled ? 'translate-x-6' : 'translate-x-1'
                ]"
              />
            </button>
          </div>
        </div>
      </div>

      <div class="card-premium p-6">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-lg mr-3">
            <CurrencyDollarIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">Configuración de Pagos</h3>
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Moneda</label>
            <select
              v-model="paymentSettings.currency"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            >
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="USD">USD - Dólar Estadounidense</option>
              <option value="EUR">EUR - Euro</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Impuesto (%)</label>
            <input
              v-model="paymentSettings.tax"
              type="number"
              step="0.01"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            >
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Propina Sugerida (%)</label>
            <input
              v-model="paymentSettings.tip"
              type="number"
              step="0.01"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            >
          </div>

          <div class="space-y-3">
            <label class="block text-sm font-semibold text-gray-700">Métodos de Pago Aceptados</label>
            <div v-for="method in paymentMethods" :key="method.id" class="flex items-center p-3 bg-gray-50 rounded-xl">
              <input
                :id="method.id"
                v-model="method.enabled"
                type="checkbox"
                class="h-5 w-5 text-ifood-red border-gray-300 rounded focus:ring-ifood-red"
              >
              <label :for="method.id" class="ml-3 text-gray-900 font-medium cursor-pointer flex-1">
                {{ method.name }}
              </label>
            </div>
          </div>

          <button
            @click="savePaymentSettings"
            class="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Guardar Configuración de Pagos
          </button>
        </div>
      </div>

      <div class="card-premium p-6">
        <div class="flex items-center mb-6">
          <div class="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg mr-3">
            <ClockIcon class="h-6 w-6 text-white" />
          </div>
          <h3 class="text-xl font-bold text-gray-900">Operaciones</h3>
        </div>

        <div class="space-y-6">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Tiempo de Preparación Promedio (min)</label>
            <input
              v-model="operationSettings.avgPrepTime"
              type="number"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            >
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Tiempo de Entrega Promedio (min)</label>
            <input
              v-model="operationSettings.avgDeliveryTime"
              type="number"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            >
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Costo de Envío ($)</label>
            <input
              v-model="operationSettings.deliveryFee"
              type="number"
              step="0.01"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            >
          </div>

          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Pedido Mínimo para Envío Gratis ($)</label>
            <input
              v-model="operationSettings.freeDeliveryMinimum"
              type="number"
              step="0.01"
              class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-ifood-red/20 focus:border-ifood-red transition-all duration-300"
            >
          </div>

          <button
            @click="saveOperationSettings"
            class="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            Guardar Configuración de Operaciones
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import {
  CogIcon,
  BuildingStorefrontIcon,
  BellIcon,
  CurrencyDollarIcon,
  ClockIcon
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'

const restaurantData = ref({
  name: 'Mi Restaurante',
  address: 'Av. Principal 123, Col. Centro',
  phone: '+52 123 456 7890',
  email: 'contacto@mirestaurante.com',
  schedule: 'Lunes a Viernes: 9:00 - 22:00\nSábados y Domingos: 10:00 - 23:00'
})

const notificationSettings = ref([
  {
    id: 'new-orders',
    title: 'Nuevos Pedidos',
    description: 'Recibir notificaciones de pedidos nuevos',
    enabled: true
  },
  {
    id: 'low-stock',
    title: 'Stock Bajo',
    description: 'Alertas cuando productos están por agotarse',
    enabled: true
  },
  {
    id: 'daily-reports',
    title: 'Reportes Diarios',
    description: 'Recibir resumen diario de ventas',
    enabled: false
  },
  {
    id: 'customer-reviews',
    title: 'Reseñas de Clientes',
    description: 'Notificaciones de nuevas reseñas',
    enabled: true
  }
])

const paymentSettings = ref({
  currency: 'MXN',
  tax: 16,
  tip: 10
})

const paymentMethods = ref([
  { id: 'cash', name: 'Efectivo', enabled: true },
  { id: 'card', name: 'Tarjeta de Crédito/Débito', enabled: true },
  { id: 'transfer', name: 'Transferencia Bancaria', enabled: true },
  { id: 'digital-wallet', name: 'Monedero Digital', enabled: false }
])

const operationSettings = ref({
  avgPrepTime: 20,
  avgDeliveryTime: 30,
  deliveryFee: 35,
  freeDeliveryMinimum: 200
})

const saveRestaurantData = () => {
  console.log('Saving restaurant data:', restaurantData.value)
}

const toggleNotification = (id) => {
  const notification = notificationSettings.value.find(n => n.id === id)
  if (notification) {
    notification.enabled = !notification.enabled
  }
}

const savePaymentSettings = () => {
  console.log('Saving payment settings:', paymentSettings.value)
  console.log('Payment methods:', paymentMethods.value)
}

const saveOperationSettings = () => {
  console.log('Saving operation settings:', operationSettings.value)
}
</script>
