<template>
  <div>
    <!-- Hero Section -->
    <div class="relative overflow-hidden bg-gradient-to-br from-ifood-red via-red-500 to-red-600 rounded-3xl mb-8 shadow-2xl">
      <div class="absolute inset-0 bg-black/10"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-white/10"></div>
      <div class="relative px-8 py-12">
        <div class="flex items-center justify-between">
          <div class="text-white">
            <div class="flex items-center space-x-4 mb-4">
              <div class="p-4 bg-white/20 rounded-2xl backdrop-blur-sm floating-animation">
                <ChartBarIcon class="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 class="text-4xl sm:text-5xl font-black mb-2">Dashboard</h1>
                <p class="text-xl text-red-100 font-medium">Bienvenido a tu panel de control iFood Manager</p>
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
                  <div class="text-3xl font-black">18:45</div>
                  <div class="text-sm opacity-80">Hora actual</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatsCard
        title="Ventas Hoy"
        value="$1,247"
        :icon="CurrencyDollarIcon"
        change="+12%"
        changeType="increase"
        variant="primary"
        format="currency"
        :progress="85"
      />
      <StatsCard
        title="Pedidos Activos"
        value="23"
        :icon="ShoppingCartIcon"
        change="+8%"
        changeType="increase"
        variant="secondary"
        :progress="65"
      />
      <StatsCard
        title="Productos Bajo Stock"
        value="5"
        :icon="ExclamationTriangleIcon"
        change="-2"
        changeType="decrease"
        variant="warning"
        :progress="30"
      />
      <StatsCard
        title="Clientes Nuevos"
        value="12"
        :icon="UserPlusIcon"
        change="+15%"
        changeType="increase"
        variant="success"
        :progress="90"
      />
    </div>

    <!-- Recent Orders -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      <div class="card-premium p-6">
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center">
            <div class="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg mr-3">
              <ShoppingCartIcon class="h-6 w-6 text-white" />
            </div>
            <h3 class="text-xl font-bold text-gray-900">Pedidos Recientes</h3>
          </div>
          <span class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            {{ recentOrders.length }} activos
          </span>
        </div>
        <div class="space-y-4">
          <OrderCard
            v-for="order in recentOrders"
            :key="order.id"
            :order="order"
            @accept="handleAcceptOrder"
            @start-preparation="handleStartPreparation"
            @ready="handleOrderReady"
            @dispatch="handleDispatchOrder"
            @cancel="handleCancelOrder"
            @view-details="handleViewDetails"
          />
        </div>
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
          <NuxtLink to="/pedidos" class="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 text-center">
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
        <div class="text-sm text-gray-500 font-medium">Actualizado hace 5 min</div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="text-center group">
          <div class="relative mb-4">
            <div class="absolute inset-0 bg-gradient-to-r from-ifood-red to-red-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            <div class="relative bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-6 transform group-hover:scale-105 transition-transform duration-300">
              <div class="text-4xl font-black text-ifood-red mb-2">18 min</div>
              <div class="text-sm font-semibold text-gray-600">Tiempo Promedio Preparación</div>
            </div>
          </div>
        </div>
        <div class="text-center group">
          <div class="relative mb-4">
            <div class="absolute inset-0 bg-gradient-to-r from-ifood-green to-green-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            <div class="relative bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 transform group-hover:scale-105 transition-transform duration-300">
              <div class="text-4xl font-black text-ifood-green mb-2">94.5%</div>
              <div class="text-sm font-semibold text-gray-600">Satisfacción Cliente</div>
            </div>
          </div>
        </div>
        <div class="text-center group">
          <div class="relative mb-4">
            <div class="absolute inset-0 bg-gradient-to-r from-ifood-orange to-orange-600 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            <div class="relative bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 transform group-hover:scale-105 transition-transform duration-300">
              <div class="text-4xl font-black text-ifood-orange mb-2">32 min</div>
              <div class="text-sm font-semibold text-gray-600">Tiempo Promedio Entrega</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { 
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  UserPlusIcon,
  DocumentTextIcon,
  CubeIcon,
  ChartBarIcon,
  ChartPieIcon,
  CogIcon
} from '@heroicons/vue/24/outline'
import StatsCard from '~/components/StatsCard.vue'
import OrderCard from '~/components/OrderCard.vue'

definePageMeta({
  layout: 'default'
})

const recentOrders = ref([
  {
    id: '001247',
    customerName: 'María García',
    customerImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop',
    items: [
      { id: 1, name: 'Pizza Margherita', quantity: 1, price: 15.99 },
      { id: 2, name: 'Coca Cola', quantity: 2, price: 2.50 }
    ],
    subtotal: 20.99,
    deliveryFee: 3.50,
    total: 24.49,
    status: 'pendiente',
    type: 'delivery',
    deliveryAddress: 'Av. Principal 123, Col. Centro',
    estimatedTime: 25,
    createdAt: new Date()
  },
  {
    id: '001246',
    customerName: 'Juan López',
    customerImage: 'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop',
    items: [
      { id: 3, name: 'Hamburguesa Clásica', quantity: 2, price: 12.50 }
    ],
    subtotal: 25.00,
    deliveryFee: 0,
    total: 25.00,
    status: 'preparando',
    type: 'pickup',
    estimatedTime: 15,
    createdAt: new Date()
  }
])

const handleAcceptOrder = (orderId) => {
  console.log('Accepting order:', orderId)
}

const handleStartPreparation = (orderId) => {
  console.log('Starting preparation:', orderId)
}

const handleOrderReady = (orderId) => {
  console.log('Order ready:', orderId)
}

const handleDispatchOrder = (orderId) => {
  console.log('Dispatching order:', orderId)
}

const handleCancelOrder = (orderId) => {
  console.log('Canceling order:', orderId)
}

const handleViewDetails = (order) => {
  console.log('Viewing order details:', order)
}
</script>