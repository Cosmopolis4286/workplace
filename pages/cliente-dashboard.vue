<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
    <!-- Header Section -->
    <div class="bg-gradient-to-r from-green-500 via-teal-500 to-blue-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
            <ShoppingBag class="w-8 h-8" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">Mi Panel de Cliente</h1>
            <p class="text-green-100">Gestiona tus pedidos y compras</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <NuxtLink to="/perfil" class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200">
            <User class="w-6 h-6" />
          </NuxtLink>
          <div class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200">
            <Bell class="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Overview -->
    <div class="p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Mis Pedidos</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.totalOrders }}</p>
              <p class="text-green-500 text-sm flex items-center mt-1">
                <TrendingUp class="w-4 h-4 mr-1" />
                Activos: {{ stats.activeOrders }}
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg">
              <ShoppingBag class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Gasto Total</p>
              <p class="text-3xl font-bold text-gray-800">${{ stats.totalSpent }}</p>
              <p class="text-blue-500 text-sm flex items-center mt-1">
                <DollarSign class="w-4 h-4 mr-1" />
                Este mes
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg">
              <DollarSign class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Pendientes</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.pendingOrders }}</p>
              <p class="text-yellow-500 text-sm flex items-center mt-1">
                <Clock class="w-4 h-4 mr-1" />
                En proceso
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg">
              <Clock class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Completados</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.completedOrders }}</p>
              <p class="text-green-500 text-sm flex items-center mt-1">
                <CheckCircle class="w-4 h-4 mr-1" />
                Exitosos
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl shadow-lg">
              <CheckCircle class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
        <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <Plus class="w-6 h-6 mr-2 text-green-500" />
          Acciones Rápidas
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button @click="showNewOrderModal = true" class="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg font-semibold">
            <ShoppingBag class="w-8 h-8 mx-auto mb-2" />
            <span class="block text-sm">Nuevo Pedido</span>
          </button>

          <button class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg font-semibold">
            <MessageSquare class="w-8 h-8 mx-auto mb-2" />
            <span class="block text-sm">Contactar Soporte</span>
          </button>
        </div>
      </div>

      <!-- Active Orders -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <ShoppingBag class="w-6 h-6 mr-2 text-green-500" />
            Mis Pedidos Activos
          </h2>
          <span class="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            {{ activeOrders.length }}
          </span>
        </div>

        <div v-if="activeOrders.length === 0" class="text-center py-12">
          <ShoppingBag class="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p class="text-gray-600 text-lg font-medium">No tienes pedidos activos</p>
          <p class="text-gray-500 text-sm mt-2">Crea un nuevo pedido para empezar</p>
        </div>

        <div v-else class="space-y-4">
          <div v-for="order in activeOrders" :key="order.id"
               class="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                  {{ order.customer_name.charAt(0) }}
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800">{{ order.order_number }}</h3>
                  <p class="text-sm text-gray-500">{{ order.customer_name }}</p>
                </div>
              </div>
              <span :class="getStatusClass(order.status)" class="px-3 py-1 rounded-full text-xs font-medium">
                {{ formatStatus(order.status) }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p class="text-xs text-gray-600 font-semibold">Monto</p>
                <p class="text-lg font-bold text-green-600">${{ order.total_amount }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-semibold">Creado</p>
                <p class="text-sm text-gray-800">{{ formatDate(order.created_at) }}</p>
              </div>
              <div>
                <p class="text-xs text-gray-600 font-semibold">Ítems</p>
                <p class="text-lg font-bold text-gray-800">{{ order.item_count || 0 }}</p>
              </div>
            </div>

            <button @click="viewOrderDetails(order)" class="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-3 rounded-lg hover:scale-105 transition-transform duration-200 text-sm font-semibold">
              Ver Detalles
            </button>
          </div>
        </div>
      </div>

      <!-- Recent Orders History -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <History class="w-6 h-6 mr-2 text-blue-500" />
            Historial de Pedidos
          </h2>
          <button class="text-blue-500 hover:text-blue-700 font-semibold text-sm">Ver todo</button>
        </div>

        <div v-if="recentOrders.length === 0" class="text-center py-8 text-gray-500">
          <p>No hay pedidos en el historial</p>
        </div>

        <div v-else class="space-y-3">
          <div v-for="order in recentOrders" :key="order.id"
               class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div class="flex items-center space-x-3 flex-1">
              <div class="w-10 h-10 rounded-full" :class="getOrderTypeColor(order.order_type)"></div>
              <div class="flex-1">
                <p class="font-semibold text-gray-800">{{ order.order_number }}</p>
                <p class="text-sm text-gray-500">{{ formatDate(order.completed_at || order.created_at) }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="font-bold text-gray-800">${{ order.total_amount }}</p>
              <span class="text-xs font-semibold text-gray-600">{{ formatStatus(order.status) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Details Modal -->
    <div v-if="showDetailsModal && selectedOrder" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 sticky top-0 bg-white">
          <h3 class="text-2xl font-bold text-gray-800">Detalles del Pedido</h3>
          <button @click="closeDetailsModal" class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div class="space-y-6">
          <div class="grid grid-cols-2 gap-6">
            <div>
              <p class="text-sm text-gray-600 font-semibold">Número de Pedido</p>
              <p class="text-lg font-bold text-gray-800">{{ selectedOrder.order_number }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600 font-semibold">Estado</p>
              <span :class="getStatusClass(selectedOrder.status)" class="px-3 py-1 rounded-full text-sm font-semibold inline-block">
                {{ formatStatus(selectedOrder.status) }}
              </span>
            </div>
            <div>
              <p class="text-sm text-gray-600 font-semibold">Monto Total</p>
              <p class="text-2xl font-bold text-green-600">${{ selectedOrder.total_amount }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600 font-semibold">Fecha de Creación</p>
              <p class="text-lg font-bold text-gray-800">{{ formatDate(selectedOrder.created_at) }}</p>
            </div>
          </div>

          <div class="border-t border-gray-200 pt-6">
            <h4 class="font-semibold text-gray-800 mb-3">Información de Entrega</h4>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-sm text-gray-600">Nombre</p>
                <p class="text-gray-800">{{ selectedOrder.customer_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Teléfono</p>
                <p class="text-gray-800">{{ selectedOrder.customer_phone }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-600">Email</p>
                <p class="text-gray-800">{{ selectedOrder.customer_email || 'No especificado' }}</p>
              </div>
              <div v-if="selectedOrder.scheduled_date">
                <p class="text-sm text-gray-600">Fecha Programada</p>
                <p class="text-gray-800">{{ selectedOrder.scheduled_date }} {{ selectedOrder.scheduled_time }}</p>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-200 pt-6">
            <h4 class="font-semibold text-gray-800 mb-3">Notas</h4>
            <p class="text-gray-700 bg-gray-50 p-3 rounded-lg">{{ selectedOrder.notes || 'Sin notas adicionales' }}</p>
          </div>
        </div>

        <div class="flex space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button @click="closeDetailsModal" class="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-semibold">
            Cerrar
          </button>
          <button v-if="selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled'" class="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 font-semibold">
            Contactar Soporte
          </button>
        </div>
      </div>
    </div>

    <!-- New Order Modal -->
    <div v-if="showNewOrderModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 class="text-xl font-bold text-gray-800 mb-4">Nuevo Pedido</h3>
        <div class="space-y-4">
          <input type="text" placeholder="Descripción del pedido" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
          <textarea placeholder="Notas adicionales" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" rows="3"></textarea>
          <select class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
            <option>Seleccionar tipo de pedido</option>
            <option>Inmediato</option>
            <option>Programado</option>
          </select>
        </div>
        <div class="flex space-x-3 mt-6">
          <button @click="showNewOrderModal = false" class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200 font-semibold">
            Cancelar
          </button>
          <button class="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200 font-semibold">
            Crear
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  ShoppingBag, User, Bell, ShoppingCart, DollarSign, Clock, CheckCircle,
  Plus, MessageSquare, History, TrendingUp
} from 'lucide-vue-next'
const showDetailsModal = ref(false)
const showNewOrderModal = ref(false)
const selectedOrder = ref(null)

const stats = ref({
  totalOrders: 12,
  activeOrders: 3,
  totalSpent: 2847.50,
  pendingOrders: 2,
  completedOrders: 9
})

const activeOrders = ref([
  {
    id: '1',
    order_number: 'ORD-2024-001',
    customer_name: 'Juan García',
    status: 'preparing',
    total_amount: 125.50,
    item_count: 3,
    created_at: new Date().toISOString(),
    customer_phone: '555-1234',
    customer_email: 'juan@example.com',
    scheduled_date: null,
    scheduled_time: null,
    notes: 'Entrega urgente',
    order_type: 'immediate'
  },
  {
    id: '2',
    order_number: 'ORD-2024-002',
    customer_name: 'Juan García',
    status: 'pending',
    total_amount: 89.99,
    item_count: 2,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    customer_phone: '555-1234',
    customer_email: 'juan@example.com',
    scheduled_date: null,
    scheduled_time: null,
    notes: '',
    order_type: 'immediate'
  },
  {
    id: '3',
    order_number: 'ORD-2024-003',
    customer_name: 'Juan García',
    status: 'in_delivery',
    total_amount: 156.00,
    item_count: 4,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    customer_phone: '555-1234',
    customer_email: 'juan@example.com',
    scheduled_date: '2024-01-20',
    scheduled_time: '18:00',
    notes: 'Dejar en la puerta',
    order_type: 'immediate'
  }
])

const recentOrders = ref([
  {
    id: '4',
    order_number: 'ORD-2024-000',
    status: 'completed',
    total_amount: 234.50,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    completed_at: new Date(Date.now() - 82800000).toISOString(),
    order_type: 'immediate'
  },
  {
    id: '5',
    order_number: 'ORD-2023-150',
    status: 'completed',
    total_amount: 567.99,
    created_at: new Date(Date.now() - 259200000).toISOString(),
    completed_at: new Date(Date.now() - 255600000).toISOString(),
    order_type: 'scheduled'
  }
])

const getStatusClass = (status) => {
  const classes = {
    pending: 'bg-yellow-100 text-yellow-800',
    preparing: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    in_delivery: 'bg-purple-100 text-purple-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const getOrderTypeColor = (type) => {
  return type === 'immediate' ? 'bg-green-100' : 'bg-blue-100'
}

const formatStatus = (status) => {
  const statusMap = {
    pending: 'Pendiente',
    preparing: 'Preparando',
    ready: 'Listo',
    in_delivery: 'En Entrega',
    completed: 'Completado',
    cancelled: 'Cancelado'
  }
  return statusMap[status] || status
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const viewOrderDetails = (order) => {
  selectedOrder.value = order
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedOrder.value = null
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>
