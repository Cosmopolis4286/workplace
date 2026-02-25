<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
    <!-- Header Section -->
    <div class="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-float">
            <Users class="w-8 h-8" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">Gestión de Clientes</h1>
            <p class="text-blue-100">Base de datos de clientes y análisis</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200">
            <Search class="w-6 h-6" />
          </div>
          <div class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200">
            <Filter class="w-6 h-6" />
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
              <p class="text-gray-600 text-sm font-medium">Total Clientes</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.totalClients }}</p>
              <p class="text-green-500 text-sm flex items-center mt-1">
                <TrendingUp class="w-4 h-4 mr-1" />
                +15% este mes
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg animate-pulse">
              <Users class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Clientes Activos</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.activeClients }}</p>
              <p class="text-blue-500 text-sm flex items-center mt-1">
                <Activity class="w-4 h-4 mr-1" />
                Últimos 30 días
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg animate-bounce">
              <Activity class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Valor Promedio</p>
              <p class="text-3xl font-bold text-gray-800">${{ stats.avgOrderValue }}</p>
              <p class="text-purple-500 text-sm flex items-center mt-1">
                <DollarSign class="w-4 h-4 mr-1" />
                Por pedido
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
              <p class="text-gray-600 text-sm font-medium">Satisfacción</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.satisfaction }}%</p>
              <p class="text-yellow-500 text-sm flex items-center mt-1">
                <Star class="w-4 h-4 mr-1" />
                4.7/5 estrellas
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg animate-pulse">
              <Star class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Filters Section -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Buscar clientes..."
              class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
            />
          </div>
          
          <select v-model="selectedSegment" class="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm">
            <option value="">Todos los segmentos</option>
            <option value="VIP">VIP</option>
            <option value="Premium">Premium</option>
            <option value="Regular">Regular</option>
            <option value="Nuevo">Nuevo</option>
          </select>

          <select v-model="selectedStatus" class="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm">
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>

          <button class="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg">
            <Plus class="w-5 h-5 inline mr-2" />
            Nuevo Cliente
          </button>
        </div>
      </div>

      <!-- Clients Table -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
        <div class="p-6 border-b border-gray-200">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <Users class="w-6 h-6 mr-2 text-blue-500" />
            Lista de Clientes
          </h2>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gradient-to-r from-gray-50 to-gray-100">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segmento</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedidos</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gastado</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="client in filteredClients" :key="client.id" 
                  class="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold mr-4">
                      {{ client.name.charAt(0) }}
                    </div>
                    <div>
                      <div class="text-sm font-medium text-gray-900">{{ client.name }}</div>
                      <div class="text-sm text-gray-500">Cliente desde {{ client.memberSince }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="text-sm text-gray-900">{{ client.email }}</div>
                  <div class="text-sm text-gray-500">{{ client.phone }}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="getSegmentClass(client.segment)" class="px-3 py-1 rounded-full text-xs font-medium">
                    {{ client.segment }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {{ client.totalOrders }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  ${{ client.totalSpent.toFixed(2) }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span :class="client.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'" 
                        class="px-3 py-1 rounded-full text-xs font-medium">
                    {{ client.active ? 'Activo' : 'Inactivo' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button class="text-blue-600 hover:text-blue-900 hover:scale-110 transition-all duration-200">
                    <Eye class="w-5 h-5" />
                  </button>
                  <button class="text-indigo-600 hover:text-indigo-900 hover:scale-110 transition-all duration-200">
                    <Edit class="w-5 h-5" />
                  </button>
                  <button class="text-red-600 hover:text-red-900 hover:scale-110 transition-all duration-200">
                    <Trash2 class="w-5 h-5" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div class="flex items-center text-sm text-gray-700">
            Mostrando {{ (currentPage - 1) * itemsPerPage + 1 }} a {{ Math.min(currentPage * itemsPerPage, filteredClients.length) }} de {{ filteredClients.length }} clientes
          </div>
          <div class="flex items-center space-x-2">
            <button 
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="px-3 py-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105">
              <ChevronLeft class="w-5 h-5" />
            </button>
            <span class="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium">
              {{ currentPage }}
            </span>
            <button 
              @click="currentPage++"
              :disabled="currentPage >= totalPages"
              class="px-3 py-2 rounded-lg bg-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105">
              <ChevronRight class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  Users, Search, Filter, Plus, Eye, Edit, Trash2, 
  TrendingUp, Activity, DollarSign, Star, ChevronLeft, ChevronRight 
} from 'lucide-vue-next'
// Stats data
const stats = ref({
  totalClients: 1247,
  activeClients: 892,
  avgOrderValue: 32.50,
  satisfaction: 94
})

// Filter states
const searchQuery = ref('')
const selectedSegment = ref('')
const selectedStatus = ref('')
const currentPage = ref(1)
const itemsPerPage = 10

// Clients data
const clients = ref([
  {
    id: 1,
    name: 'María González',
    email: 'maria.gonzalez@email.com',
    phone: '+58 412-1234567',
    segment: 'VIP',
    totalOrders: 45,
    totalSpent: 1250.75,
    memberSince: '2023',
    active: true
  },
  {
    id: 2,
    name: 'Carlos Rodríguez',
    email: 'carlos.rodriguez@email.com',
    phone: '+58 414-2345678',
    segment: 'Premium',
    totalOrders: 28,
    totalSpent: 890.50,
    memberSince: '2023',
    active: true
  },
  {
    id: 3,
    name: 'Ana Martínez',
    email: 'ana.martinez@email.com',
    phone: '+58 416-3456789',
    segment: 'Regular',
    totalOrders: 12,
    totalSpent: 345.25,
    memberSince: '2024',
    active: false
  },
  {
    id: 4,
    name: 'José Pérez',
    email: 'jose.perez@email.com',
    phone: '+58 424-4567890',
    segment: 'VIP',
    totalOrders: 67,
    totalSpent: 2150.80,
    memberSince: '2022',
    active: true
  },
  {
    id: 5,
    name: 'Carmen Silva',
    email: 'carmen.silva@email.com',
    phone: '+58 412-5678901',
    segment: 'Premium',
    totalOrders: 34,
    totalSpent: 1050.30,
    memberSince: '2023',
    active: true
  },
  {
    id: 6,
    name: 'Luis Mendoza',
    email: 'luis.mendoza@email.com',
    phone: '+58 414-6789012',
    segment: 'Nuevo',
    totalOrders: 3,
    totalSpent: 85.50,
    memberSince: '2024',
    active: true
  },
  {
    id: 7,
    name: 'Sofia Torres',
    email: 'sofia.torres@email.com',
    phone: '+58 416-7890123',
    segment: 'Regular',
    totalOrders: 18,
    totalSpent: 520.75,
    memberSince: '2024',
    active: true
  },
  {
    id: 8,
    name: 'Pedro Ramírez',
    email: 'pedro.ramirez@email.com',
    phone: '+58 424-8901234',
    segment: 'Premium',
    totalOrders: 41,
    totalSpent: 1380.90,
    memberSince: '2023',
    active: false
  },
  {
    id: 9,
    name: 'Isabella López',
    email: 'isabella.lopez@email.com',
    phone: '+58 412-9012345',
    segment: 'VIP',
    totalOrders: 52,
    totalSpent: 1750.60,
    memberSince: '2022',
    active: true
  },
  {
    id: 10,
    name: 'Diego Herrera',
    email: 'diego.herrera@email.com',
    phone: '+58 414-0123456',
    segment: 'Regular',
    totalOrders: 15,
    totalSpent: 420.25,
    memberSince: '2024',
    active: true
  }
])

// Computed properties
const filteredClients = computed(() => {
  let filtered = clients.value

  if (searchQuery.value) {
    filtered = filtered.filter(client => 
      client.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  if (selectedSegment.value) {
    filtered = filtered.filter(client => client.segment === selectedSegment.value)
  }

  if (selectedStatus.value) {
    const isActive = selectedStatus.value === 'Activo'
    filtered = filtered.filter(client => client.active === isActive)
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredClients.value.length / itemsPerPage))

const paginatedClients = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredClients.value.slice(start, end)
})

// Helper functions
const getSegmentClass = (segment) => {
  const classes = {
    'VIP': 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800',
    'Premium': 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800',
    'Regular': 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800',
    'Nuevo': 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
  }
  return classes[segment] || 'bg-gray-100 text-gray-800'
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