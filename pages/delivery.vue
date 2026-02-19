<template>
  <div class="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
    <!-- Header Section -->
    <div class="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white p-6 rounded-b-3xl shadow-2xl">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="p-3 bg-white/20 rounded-2xl backdrop-blur-sm animate-float">
            <Truck class="w-8 h-8" />
          </div>
          <div>
            <h1 class="text-3xl font-bold">Gestión de Delivery</h1>
            <p class="text-orange-100">Control de entregas y repartidores</p>
          </div>
        </div>
        <div class="flex items-center space-x-4">
          <div class="p-2 bg-white/20 rounded-xl backdrop-blur-sm hover:scale-110 transition-transform duration-200">
            <MapPin class="w-6 h-6" />
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
              <p class="text-gray-600 text-sm font-medium">Entregas Activas</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.activeDeliveries }}</p>
              <p class="text-green-500 text-sm flex items-center mt-1">
                <TrendingUp class="w-4 h-4 mr-1" />
                +12% vs ayer
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl shadow-lg animate-pulse">
              <Truck class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Repartidores Online</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.onlineDrivers }}</p>
              <p class="text-green-500 text-sm flex items-center mt-1">
                <Users class="w-4 h-4 mr-1" />
                {{ stats.totalDrivers }} total
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-xl shadow-lg animate-bounce">
              <Users class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Tiempo Promedio</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.avgDeliveryTime }}min</p>
              <p class="text-orange-500 text-sm flex items-center mt-1">
                <Clock class="w-4 h-4 mr-1" />
                Meta: 30min
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl shadow-lg animate-spin-slow">
              <Clock class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div class="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-600 text-sm font-medium">Satisfacción</p>
              <p class="text-3xl font-bold text-gray-800">{{ stats.satisfaction }}%</p>
              <p class="text-green-500 text-sm flex items-center mt-1">
                <Star class="w-4 h-4 mr-1" />
                4.8/5 estrellas
              </p>
            </div>
            <div class="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg animate-pulse">
              <Star class="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      <!-- Active Deliveries Section -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-white/20">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <MapPin class="w-6 h-6 mr-2 text-orange-500" />
            Entregas en Curso
          </h2>
          <button class="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg">
            <Plus class="w-5 h-5 inline mr-2" />
            Nueva Entrega
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div v-for="delivery in activeDeliveries" :key="delivery.id" 
               class="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <div class="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold">
                  {{ delivery.driver.charAt(0) }}
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800">{{ delivery.driver }}</h3>
                  <p class="text-sm text-gray-500">{{ delivery.vehicle }}</p>
                </div>
              </div>
              <span :class="getStatusClass(delivery.status)" class="px-3 py-1 rounded-full text-xs font-medium">
                {{ delivery.status }}
              </span>
            </div>
            
            <div class="space-y-2 mb-4">
              <div class="flex items-center text-sm text-gray-600">
                <MapPin class="w-4 h-4 mr-2 text-orange-500" />
                {{ delivery.address }}
              </div>
              <div class="flex items-center text-sm text-gray-600">
                <Clock class="w-4 h-4 mr-2 text-blue-500" />
                {{ delivery.estimatedTime }} min
              </div>
              <div class="flex items-center text-sm text-gray-600">
                <DollarSign class="w-4 h-4 mr-2 text-green-500" />
                ${{ delivery.total }}
              </div>
            </div>

            <div class="flex space-x-2">
              <button class="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-2 px-4 rounded-lg hover:scale-105 transition-transform duration-200 text-sm">
                <Phone class="w-4 h-4 inline mr-1" />
                Llamar
              </button>
              <button class="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:scale-105 transition-transform duration-200 text-sm">
                <MapPin class="w-4 h-4 inline mr-1" />
                Rastrear
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Drivers Section -->
      <div class="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-white/20">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-800 flex items-center">
            <Users class="w-6 h-6 mr-2 text-green-500" />
            Repartidores
          </h2>
          <button class="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg">
            <UserPlus class="w-5 h-5 inline mr-2" />
            Agregar Repartidor
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div v-for="driver in drivers" :key="driver.id"
               class="bg-gradient-to-br from-white to-gray-50 p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
            <div class="flex items-center space-x-3 mb-3">
              <div class="relative">
                <div class="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {{ driver.name.charAt(0) }}
                </div>
                <div :class="driver.online ? 'bg-green-400' : 'bg-gray-400'" 
                     class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800">{{ driver.name }}</h3>
                <p class="text-sm text-gray-500">{{ driver.vehicle }}</p>
              </div>
            </div>
            
            <div class="space-y-1 text-xs text-gray-600">
              <div class="flex justify-between">
                <span>Entregas hoy:</span>
                <span class="font-semibold">{{ driver.deliveriesToday }}</span>
              </div>
              <div class="flex justify-between">
                <span>Rating:</span>
                <span class="font-semibold flex items-center">
                  <Star class="w-3 h-3 text-yellow-400 mr-1" />
                  {{ driver.rating }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { 
  Truck, MapPin, Clock, Users, Star, Phone, DollarSign, 
  Plus, UserPlus, TrendingUp 
} from 'lucide-vue-next'
// Stats data
const stats = ref({
  activeDeliveries: 24,
  onlineDrivers: 8,
  totalDrivers: 12,
  avgDeliveryTime: 28,
  satisfaction: 94
})

// Active deliveries data
const activeDeliveries = ref([
  {
    id: 1,
    driver: 'Carlos Mendoza',
    vehicle: 'Moto Honda',
    address: 'Av. Libertador 1234, Caracas',
    estimatedTime: 15,
    total: 25.50,
    status: 'En camino'
  },
  {
    id: 2,
    driver: 'María González',
    vehicle: 'Bicicleta',
    address: 'Calle Real 567, Chacao',
    estimatedTime: 8,
    total: 18.75,
    status: 'Recogiendo'
  },
  {
    id: 3,
    driver: 'José Rodríguez',
    vehicle: 'Moto Yamaha',
    address: 'Centro Comercial Sambil',
    estimatedTime: 22,
    total: 42.30,
    status: 'Entregando'
  },
  {
    id: 4,
    driver: 'Ana Pérez',
    vehicle: 'Carro Compacto',
    address: 'Urbanización El Rosal',
    estimatedTime: 35,
    total: 67.80,
    status: 'En camino'
  },
  {
    id: 5,
    driver: 'Luis Martínez',
    vehicle: 'Moto Suzuki',
    address: 'Las Mercedes, Caracas',
    estimatedTime: 12,
    total: 31.25,
    status: 'Recogiendo'
  },
  {
    id: 6,
    driver: 'Carmen Silva',
    vehicle: 'Bicicleta Eléctrica',
    address: 'Altamira, Caracas',
    estimatedTime: 18,
    total: 29.90,
    status: 'En camino'
  }
])

// Drivers data
const drivers = ref([
  {
    id: 1,
    name: 'Carlos Mendoza',
    vehicle: 'Moto Honda',
    online: true,
    deliveriesToday: 8,
    rating: 4.9
  },
  {
    id: 2,
    name: 'María González',
    vehicle: 'Bicicleta',
    online: true,
    deliveriesToday: 12,
    rating: 4.8
  },
  {
    id: 3,
    name: 'José Rodríguez',
    vehicle: 'Moto Yamaha',
    online: true,
    deliveriesToday: 6,
    rating: 4.7
  },
  {
    id: 4,
    name: 'Ana Pérez',
    vehicle: 'Carro Compacto',
    online: false,
    deliveriesToday: 4,
    rating: 4.9
  },
  {
    id: 5,
    name: 'Luis Martínez',
    vehicle: 'Moto Suzuki',
    online: true,
    deliveriesToday: 9,
    rating: 4.6
  },
  {
    id: 6,
    name: 'Carmen Silva',
    vehicle: 'Bicicleta Eléctrica',
    online: true,
    deliveriesToday: 7,
    rating: 4.8
  },
  {
    id: 7,
    name: 'Pedro Ramírez',
    vehicle: 'Moto Kawasaki',
    online: false,
    deliveriesToday: 3,
    rating: 4.5
  },
  {
    id: 8,
    name: 'Sofia Torres',
    vehicle: 'Scooter',
    online: true,
    deliveriesToday: 11,
    rating: 4.9
  }
])

// Status class helper
const getStatusClass = (status) => {
  const classes = {
    'En camino': 'bg-blue-100 text-blue-800',
    'Recogiendo': 'bg-yellow-100 text-yellow-800',
    'Entregando': 'bg-green-100 text-green-800',
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