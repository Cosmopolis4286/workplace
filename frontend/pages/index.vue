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
      <div class="card-premium p-6 flex flex-col h-[600px]">
        <div class="flex items-center justify-between mb-6 flex-shrink-0">
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
        <div class="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
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

    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showOrderDetailModal"
          class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          @click="closeDetailModal"
        >
          <div
            @click.stop
            class="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
          >
            <div class="bg-gradient-to-r from-ifood-red via-red-500 to-red-600 text-white p-6 relative">
              <button
                @click="closeDetailModal"
                class="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
              >
                <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <div class="flex items-center space-x-4">
                <img
                  v-if="selectedOrder"
                  :src="selectedOrder.customerImage"
                  :alt="selectedOrder.customerName"
                  class="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/20"
                >
                <div>
                  <h2 class="text-2xl font-bold">{{ selectedOrder?.customerName }}</h2>
                  <p class="text-red-100">Pedido #{{ selectedOrder?.id }}</p>
                </div>
              </div>
            </div>

            <div class="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div class="mb-6">
                <h3 class="text-lg font-bold text-gray-800 mb-4">Detalles del Pedido</h3>
                <div class="space-y-3">
                  <div
                    v-for="item in selectedOrder?.items"
                    :key="item.id"
                    class="flex justify-between items-center bg-gray-50 rounded-xl p-4"
                  >
                    <div class="flex items-center space-x-3">
                      <span class="bg-ifood-red text-white font-bold px-3 py-1 rounded-full text-sm">
                        {{ item.quantity }}x
                      </span>
                      <span class="font-semibold text-gray-800">{{ item.name }}</span>
                    </div>
                    <span class="font-bold text-gray-800">${{ (item.price * item.quantity).toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6">
                <div class="space-y-3">
                  <div class="flex justify-between items-center text-gray-700">
                    <span>Subtotal:</span>
                    <span class="font-semibold">${{ selectedOrder?.subtotal.toFixed(2) }}</span>
                  </div>
                  <div class="flex justify-between items-center text-gray-700">
                    <span>Costo de entrega:</span>
                    <span class="font-semibold">${{ selectedOrder?.deliveryFee.toFixed(2) }}</span>
                  </div>
                  <div class="h-px bg-gray-300"></div>
                  <div class="flex justify-between items-center">
                    <span class="text-xl font-bold text-gray-800">Total:</span>
                    <span class="text-2xl font-black text-ifood-red">${{ selectedOrder?.total.toFixed(2) }}</span>
                  </div>
                </div>
              </div>

              <div v-if="selectedOrder?.deliveryAddress" class="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6">
                <h4 class="font-bold text-gray-800 mb-2 flex items-center">
                  <svg class="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Dirección de Entrega
                </h4>
                <p class="text-gray-700">{{ selectedOrder?.deliveryAddress }}</p>
                <div class="flex items-center space-x-4 mt-3">
                  <div class="flex items-center text-sm text-gray-600">
                    <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tiempo estimado: {{ selectedOrder?.estimatedTime }} min
                  </div>
                  <div v-if="selectedOrder?.driverName" class="flex items-center text-sm text-gray-600">
                    <svg class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    Conductor: {{ selectedOrder?.driverName }}
                  </div>
                </div>
              </div>

              <div class="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4">
                <h4 class="font-bold text-gray-800 mb-2">Estado del Pedido</h4>
                <div class="flex items-center justify-between">
                  <span
                    :class="[
                      'px-4 py-2 rounded-full font-semibold',
                      selectedOrder?.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      selectedOrder?.status === 'aceptado' ? 'bg-blue-100 text-blue-800' :
                      selectedOrder?.status === 'preparando' ? 'bg-orange-100 text-orange-800' :
                      selectedOrder?.status === 'listo' ? 'bg-green-100 text-green-800' :
                      selectedOrder?.status === 'enviado' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    ]"
                  >
                    {{ selectedOrder?.status.charAt(0).toUpperCase() + selectedOrder?.status.slice(1) }}
                  </span>
                  <span class="text-sm text-gray-600">
                    {{ new Date(selectedOrder?.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="bg-gray-50 px-6 py-4 flex space-x-3 border-t border-gray-200">
              <button
                @click="closeDetailModal"
                class="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-colors duration-200 font-semibold"
              >
                Cerrar
              </button>
              <button
                v-if="selectedOrder?.status === 'pendiente'"
                @click="handleAcceptOrder(selectedOrder.id); closeDetailModal()"
                class="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 font-semibold shadow-md"
              >
                Aceptar Pedido
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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
  },
  {
    id: '001245',
    customerName: 'Ana Martínez',
    customerImage: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop',
    items: [
      { id: 4, name: 'Ensalada César', quantity: 1, price: 9.99 },
      { id: 5, name: 'Jugo Natural', quantity: 1, price: 3.50 }
    ],
    subtotal: 13.49,
    deliveryFee: 2.50,
    total: 15.99,
    status: 'aceptado',
    type: 'delivery',
    deliveryAddress: 'Calle Reforma 456, Col. Norte',
    estimatedTime: 20,
    createdAt: new Date(Date.now() - 300000)
  },
  {
    id: '001244',
    customerName: 'Carlos Rodríguez',
    customerImage: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop',
    items: [
      { id: 6, name: 'Tacos al Pastor', quantity: 3, price: 4.50 },
      { id: 7, name: 'Agua de Horchata', quantity: 1, price: 2.00 }
    ],
    subtotal: 15.50,
    deliveryFee: 0,
    total: 15.50,
    status: 'listo',
    type: 'pickup',
    estimatedTime: 5,
    createdAt: new Date(Date.now() - 600000)
  }
])

const showOrderDetailModal = ref(false)
const selectedOrder = ref(null)

const handleAcceptOrder = (orderId) => {
  const order = recentOrders.value.find(o => o.id === orderId)
  if (order) {
    order.status = 'aceptado'
    useNotifications().addNotification({
      type: 'success',
      message: `Pedido #${orderId} aceptado correctamente`,
      duration: 3000
    })
  }
}

const handleStartPreparation = (orderId) => {
  const order = recentOrders.value.find(o => o.id === orderId)
  if (order) {
    order.status = 'preparando'
    useNotifications().addNotification({
      type: 'info',
      message: `Preparando pedido #${orderId}`,
      duration: 3000
    })
  }
}

const handleOrderReady = (orderId) => {
  const order = recentOrders.value.find(o => o.id === orderId)
  if (order) {
    order.status = 'listo'
    useNotifications().addNotification({
      type: 'success',
      message: `Pedido #${orderId} está listo`,
      duration: 3000
    })
  }
}

const handleDispatchOrder = (orderId) => {
  const order = recentOrders.value.find(o => o.id === orderId)
  if (order) {
    order.status = 'enviado'
    order.driverName = 'Carlos Ramírez'
    useNotifications().addNotification({
      type: 'success',
      message: `Pedido #${orderId} despachado para entrega`,
      duration: 3000
    })
  }
}

const handleCancelOrder = (orderId) => {
  const order = recentOrders.value.find(o => o.id === orderId)
  if (order && confirm(`¿Estás seguro de cancelar el pedido #${orderId}?`)) {
    order.status = 'cancelado'
    useNotifications().addNotification({
      type: 'warning',
      message: `Pedido #${orderId} cancelado`,
      duration: 3000
    })
    setTimeout(() => {
      recentOrders.value = recentOrders.value.filter(o => o.id !== orderId)
    }, 2000)
  }
}

const handleViewDetails = (order) => {
  selectedOrder.value = order
  showOrderDetailModal.value = true
}

const closeDetailModal = () => {
  showOrderDetailModal.value = false
  selectedOrder.value = null
}
</script>