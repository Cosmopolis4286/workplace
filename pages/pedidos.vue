<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
    <!-- Header Section -->
    <div class="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-float">
            <ShoppingCart class="w-8 h-8" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">Gestión de Pedidos</h1>
            <p class="text-blue-100">Sistema de pedidos y programación de servicios</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200">
            <Calendar class="w-6 h-6" />
          </div>
          <div class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200">
            <Clock class="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="p-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Pedidos Hoy</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.todayOrders }}</p>
              <p class="text-green-500 text-sm flex items-center mt-1">
                <TrendingUp class="w-4 h-4 mr-1" />
                +12% vs ayer
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg animate-pulse">
              <ShoppingCart class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Programados</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.scheduledOrders }}</p>
              <p class="text-blue-500 text-sm flex items-center mt-1">
                <Calendar class="w-4 h-4 mr-1" />
                Próximos 7 días
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg animate-bounce">
              <Calendar class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Ingresos Hoy</p>
              <p class="text-3xl font-bold text-gray-800">${{ stats.todayRevenue }}</p>
              <p class="text-purple-500 text-sm flex items-center mt-1">
                <DollarSign class="w-4 h-4 mr-1" />
                Ticket promedio: ${{ stats.avgTicket }}
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl shadow-lg animate-spin-slow">
              <DollarSign class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Tiempo Promedio</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.avgTime }}min</p>
              <p class="text-orange-500 text-sm flex items-center mt-1">
                <Clock class="w-4 h-4 mr-1" />
                Meta: 25min
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg animate-pulse">
              <Clock class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
        <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <Plus class="w-6 h-6 mr-2 text-blue-500" />
          Acciones Rápidas
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button @click="showNewOrderModal = true" class="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg">
            <ShoppingCart class="w-8 h-8 mx-auto mb-2" />
            <span class="block text-sm font-semibold">Nuevo Pedido</span>
          </button>
          
          <button @click="showScheduleModal = true" class="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg">
            <Calendar class="w-8 h-8 mx-auto mb-2" />
            <span class="block text-sm font-semibold">Programar Servicio</span>
          </button>
          
          <button class="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg">
            <Users class="w-8 h-8 mx-auto mb-2" />
            <span class="block text-sm font-semibold">Gestionar Clientes</span>
          </button>
          
          <button class="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg">
            <BarChart3 class="w-8 h-8 mx-auto mb-2" />
            <span class="block text-sm font-semibold">Ver Reportes</span>
          </button>
        </div>
      </div>

      <!-- Orders List -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <!-- Today's Orders -->
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800 flex items-center">
              <Clock class="w-6 h-6 mr-2 text-green-500" />
              Pedidos de Hoy
            </h2>
            <span class="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              {{ todayOrders.length }} activos
            </span>
          </div>

          <div class="space-y-4 max-h-96 overflow-y-auto">
            <div v-for="order in todayOrders" :key="order.id" 
                 class="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                    {{ order.customer.charAt(0) }}
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">{{ order.customer }}</h3>
                    <p class="text-sm text-gray-500">#{{ order.id }}</p>
                  </div>
                </div>
                <span :class="getStatusClass(order.status)" class="px-3 py-1 rounded-full text-xs font-medium">
                  {{ order.status }}
                </span>
              </div>
              
              <div class="space-y-1 mb-3">
                <div class="flex items-center text-sm text-gray-600">
                  <Clock class="w-4 h-4 mr-2 text-blue-500" />
                  {{ order.time }}
                </div>
                <div class="flex items-center text-sm text-gray-600">
                  <DollarSign class="w-4 h-4 mr-2 text-green-500" />
                  ${{ order.total }}
                </div>
              </div>

              <div class="flex space-x-2">
                <button class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-3 rounded-lg hover:scale-105 transition-transform duration-200 text-sm">
                  Ver Detalles
                </button>
                <button class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-3 rounded-lg hover:scale-105 transition-transform duration-200 text-sm">
                  Actualizar Estado
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Scheduled Orders -->
        <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold text-gray-800 flex items-center">
              <Calendar class="w-6 h-6 mr-2 text-purple-500" />
              Servicios Programados
            </h2>
            <span class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
              {{ scheduledOrders.length }} próximos
            </span>
          </div>

          <div class="space-y-4 max-h-96 overflow-y-auto">
            <div v-for="order in scheduledOrders" :key="order.id" 
                 class="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                    {{ order.customer.charAt(0) }}
                  </div>
                  <div>
                    <h3 class="font-semibold text-gray-800">{{ order.customer }}</h3>
                    <p class="text-sm text-gray-500">{{ order.service }}</p>
                  </div>
                </div>
                <span class="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium">
                  Programado
                </span>
              </div>
              
              <div class="space-y-1 mb-3">
                <div class="flex items-center text-sm text-gray-600">
                  <Calendar class="w-4 h-4 mr-2 text-purple-500" />
                  {{ order.scheduledDate }}
                </div>
                <div class="flex items-center text-sm text-gray-600">
                  <Clock class="w-4 h-4 mr-2 text-blue-500" />
                  {{ order.scheduledTime }}
                </div>
              </div>

              <div class="flex space-x-2">
                <button class="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 text-white py-2 px-3 rounded-lg hover:scale-105 transition-transform duration-200 text-sm">
                  Editar
                </button>
                <button class="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-2 px-3 rounded-lg hover:scale-105 transition-transform duration-200 text-sm">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Calendar View -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <Calendar class="w-6 h-6 mr-2 text-indigo-500" />
            Vista de Calendario
          </h2>
          <div class="flex space-x-2">
            <button class="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors duration-200">
              Hoy
            </button>
            <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200">
              Semana
            </button>
            <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200">
              Mes
            </button>
          </div>
        </div>

        <div class="grid grid-cols-7 gap-2 mb-4">
          <div v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']" 
               :key="day" 
               class="p-3 text-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg">
            {{ day }}
          </div>
        </div>

        <div class="grid grid-cols-7 gap-2">
          <div v-for="date in calendarDays"
               :key="date.date"
               @click="openCalendarModal(date)"
               :class="[
                 'min-h-[80px] p-2 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer',
                 date.isToday ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-gray-200',
                 date.hasOrders ? 'ring-2 ring-blue-200' : ''
               ]">
            <div class="font-medium text-sm mb-1" :class="date.isToday ? 'text-indigo-600' : 'text-gray-700'">
              {{ date.day }}
            </div>
            <div class="space-y-1">
              <div v-for="order in date.orders"
                   :key="order.id"
                   class="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate">
                {{ order.time }} - {{ order.customer }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- New Order Modal -->
    <div v-if="showNewOrderModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 class="text-xl font-bold text-gray-800 mb-4">Nuevo Pedido</h3>
        <div class="space-y-4">
          <input type="text" placeholder="Nombre del cliente" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <input type="tel" placeholder="Teléfono" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          <select class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>Seleccionar producto/servicio</option>
            <option>Pizza Margherita</option>
            <option>Hamburguesa Clásica</option>
            <option>Servicio de Catering</option>
          </select>
          <textarea placeholder="Notas adicionales" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" rows="3"></textarea>
        </div>
        <div class="flex space-x-3 mt-6">
          <button @click="showNewOrderModal = false" class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200">
            Cancelar
          </button>
          <button class="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200">
            Crear Pedido
          </button>
        </div>
      </div>
    </div>

    <!-- Schedule Modal -->
    <div v-if="showScheduleModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 class="text-xl font-bold text-gray-800 mb-4">Programar Servicio</h3>
        <div class="space-y-4">
          <input type="text" placeholder="Nombre del cliente" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
          <input type="date" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
          <input type="time" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
          <select class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
            <option>Tipo de servicio</option>
            <option>Catering para eventos</option>
            <option>Servicio a domicilio</option>
            <option>Reserva de mesa</option>
          </select>
          <textarea placeholder="Detalles del servicio" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" rows="3"></textarea>
        </div>
        <div class="flex space-x-3 mt-6">
          <button @click="showScheduleModal = false" class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200">
            Cancelar
          </button>
          <button class="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200">
            Programar
          </button>
        </div>
      </div>
    </div>

    <!-- Calendar Date Modal -->
    <div v-if="showCalendarModal && selectedDate" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl font-bold text-gray-800">
            {{ selectedDate ? `${selectedDate.day} de enero de 2024` : 'Seleccionar fecha' }}
          </h3>
          <button @click="showCalendarModal = false" class="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div v-if="selectedDate && selectedDate.hasOrders" class="mb-6">
          <h4 class="text-sm font-semibold text-gray-700 mb-3">Pedidos en esta fecha:</h4>
          <div class="space-y-2 max-h-48 overflow-y-auto">
            <div v-for="order in selectedDate.orders" :key="order.id" class="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-semibold text-gray-800">{{ order.customer }}</p>
                  <p class="text-sm text-gray-600">Hora: {{ order.time }}</p>
                </div>
                <button class="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors">
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="mb-6 text-center text-gray-600">
          <p class="text-sm">No hay pedidos programados para esta fecha</p>
        </div>

        <div class="space-y-4 mb-6">
          <input type="text" placeholder="Nombre del cliente" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
          <input type="time" placeholder="Hora" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
          <select class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
            <option>Seleccionar tipo</option>
            <option>Pedido</option>
            <option>Agendamiento</option>
          </select>
          <textarea placeholder="Notas" class="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" rows="2"></textarea>
        </div>

        <div class="flex space-x-3">
          <button @click="showCalendarModal = false" class="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200">
            Cancelar
          </button>
          <button class="flex-1 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors duration-200">
            Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  ShoppingCart, Calendar, Clock, Plus, Users, BarChart3, 
  TrendingUp, DollarSign 
} from 'lucide-vue-next'

definePageMeta({
  layout: 'default',
  middleware: 'auth'
})

// Modal states
const showNewOrderModal = ref(false)
const showScheduleModal = ref(false)
const showCalendarModal = ref(false)
const selectedDate = ref(null)

// Stats data
const stats = ref({
  todayOrders: 24,
  scheduledOrders: 18,
  todayRevenue: 1247,
  avgTicket: 32.50,
  avgTime: 22
})

// Today's orders data
const todayOrders = ref([
  {
    id: 'ORD-001',
    customer: 'María González',
    time: '14:30',
    total: 45.80,
    status: 'Preparando'
  },
  {
    id: 'ORD-002',
    customer: 'Carlos Rodríguez',
    time: '15:15',
    total: 28.50,
    status: 'Listo'
  },
  {
    id: 'ORD-003',
    customer: 'Ana Martínez',
    time: '15:45',
    total: 67.20,
    status: 'Pendiente'
  },
  {
    id: 'ORD-004',
    customer: 'José Pérez',
    time: '16:00',
    total: 34.90,
    status: 'En Delivery'
  }
])

// Scheduled orders data
const scheduledOrders = ref([
  {
    id: 'SCH-001',
    customer: 'Carmen Silva',
    service: 'Catering para evento',
    scheduledDate: '2024-01-20',
    scheduledTime: '18:00'
  },
  {
    id: 'SCH-002',
    customer: 'Luis Mendoza',
    service: 'Reserva de mesa',
    scheduledDate: '2024-01-21',
    scheduledTime: '20:30'
  },
  {
    id: 'SCH-003',
    customer: 'Sofia Torres',
    service: 'Servicio a domicilio',
    scheduledDate: '2024-01-22',
    scheduledTime: '12:00'
  }
])

// Calendar data
const calendarDays = computed(() => {
  const days = []
  const today = new Date()
  
  for (let i = 1; i <= 31; i++) {
    const date = new Date(2024, 0, i) // January 2024
    const isToday = i === today.getDate()
    const dayOrders = i === 15 ? [
      { id: 1, time: '14:30', customer: 'María G.' },
      { id: 2, time: '16:00', customer: 'Carlos R.' }
    ] : i === 20 ? [
      { id: 3, time: '18:00', customer: 'Carmen S.' }
    ] : []
    
    days.push({
      date: date.toISOString().split('T')[0],
      day: i,
      isToday,
      hasOrders: dayOrders.length > 0,
      orders: dayOrders
    })
  }
  
  return days
})

// Calendar modal functions
const openCalendarModal = (date) => {
  selectedDate.value = date
  showCalendarModal.value = true
}

// Helper functions
const getStatusClass = (status) => {
  const classes = {
    'Pendiente': 'bg-yellow-100 text-yellow-800',
    'Preparando': 'bg-blue-100 text-blue-800',
    'Listo': 'bg-green-100 text-green-800',
    'En Delivery': 'bg-purple-100 text-purple-800',
    'Completado': 'bg-gray-100 text-gray-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}
</script>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

.animate-spin-slow {
  animation: spin-slow 3s linear infinite;
}
</style>