<template>
  <div>
    <div class="mb-8 flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Agendamientos</h1>
        <p class="mt-2 text-gray-600">Gestiona las reservas y citas</p>
      </div>
      <button class="btn-primary flex items-center">
        <PlusIcon class="h-5 w-5 mr-2" />
        Nueva Reserva
      </button>
    </div>

    <!-- Calendar View Toggle -->
    <div class="card p-6 mb-6">
      <div class="flex justify-between items-center">
        <div class="flex space-x-4">
          <button 
            :class="[
              'px-4 py-2 rounded-md font-medium transition-colors',
              viewMode === 'calendar' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
            @click="viewMode = 'calendar'"
          >
            Vista Calendario
          </button>
          <button 
            :class="[
              'px-4 py-2 rounded-md font-medium transition-colors',
              viewMode === 'list' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            ]"
            @click="viewMode = 'list'"
          >
            Vista Lista
          </button>
        </div>
        <div class="flex items-center space-x-4">
          <select 
            v-model="selectedStatus"
            class="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Todos los estados</option>
            <option value="confirmada">Confirmada</option>
            <option value="pendiente">Pendiente</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Calendar View -->
    <div v-if="viewMode === 'calendar'" class="card p-6 mb-6">
      <div class="mb-4 flex justify-between items-center">
        <h2 class="text-xl font-semibold text-gray-900">Enero 2024</h2>
        <div class="flex space-x-2">
          <button class="p-2 hover:bg-gray-100 rounded-md">
            <ChevronLeftIcon class="h-5 w-5" />
          </button>
          <button class="p-2 hover:bg-gray-100 rounded-md">
            <ChevronRightIcon class="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div class="grid grid-cols-7 gap-1 mb-4">
        <div v-for="day in ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']" 
             :key="day" 
             class="p-3 text-center text-sm font-medium text-gray-500"
        >
          {{ day }}
        </div>
        
        <div v-for="date in calendarDays" 
             :key="date.date" 
             :class="[
               'min-h-[100px] p-2 border border-gray-100',
               date.isToday ? 'bg-primary-50' : 'bg-white',
               date.isOtherMonth ? 'text-gray-300' : 'text-gray-900'
             ]"
        >
          <div class="font-medium text-sm mb-1">{{ date.day }}</div>
          <div class="space-y-1">
            <div v-for="booking in date.bookings" 
                 :key="booking.id" 
                 :class="[
                   'text-xs p-1 rounded truncate',
                   booking.status === 'confirmada' ? 'bg-green-100 text-green-800' :
                   booking.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                   'bg-red-100 text-red-800'
                 ]"
            >
              {{ booking.time }} - {{ booking.customer }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-if="viewMode === 'list'" class="space-y-6">
      <div v-for="dayGroup in groupedBookings" :key="dayGroup.date" class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">{{ dayGroup.dateLabel }}</h3>
        <div class="space-y-4">
          <div v-for="booking in dayGroup.bookings" 
               :key="booking.id" 
               class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center space-x-4">
              <div class="flex-shrink-0">
                <img :src="booking.customerImage" :alt="booking.customer" class="h-12 w-12 rounded-full">
              </div>
              <div>
                <h4 class="text-sm font-medium text-gray-900">{{ booking.customer }}</h4>
                <p class="text-sm text-gray-500">{{ booking.service }}</p>
                <div class="flex items-center mt-1">
                  <ClockIcon class="h-4 w-4 text-gray-400 mr-1" />
                  <span class="text-sm text-gray-500">{{ booking.time }}</span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center space-x-4">
              <span 
                :class="[
                  'inline-flex px-3 py-1 text-xs font-medium rounded-full',
                  booking.status === 'confirmada' ? 'bg-green-100 text-green-800' :
                  booking.status === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                ]"
              >
                {{ getStatusText(booking.status) }}
              </span>
              
              <div class="flex space-x-2">
                <button @click="handleEdit(booking)" class="p-2 text-primary-600 hover:text-primary-700">
                  <PencilIcon class="h-4 w-4" />
                </button>
                <button @click="handleCancel(booking)" class="p-2 text-red-600 hover:text-red-700">
                  <TrashIcon class="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      <div class="card p-6">
        <div class="flex items-center">
          <div class="p-3 bg-primary-100 rounded-full">
            <CalendarIcon class="h-8 w-8 text-primary-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Reservas Hoy</p>
            <p class="text-2xl font-semibold text-gray-900">8</p>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center">
          <div class="p-3 bg-green-100 rounded-full">
            <CheckCircleIcon class="h-8 w-8 text-green-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Confirmadas</p>
            <p class="text-2xl font-semibold text-gray-900">6</p>
          </div>
        </div>
      </div>

      <div class="card p-6">
        <div class="flex items-center">
          <div class="p-3 bg-yellow-100 rounded-full">
            <ClockIcon class="h-8 w-8 text-yellow-600" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Pendientes</p>
            <p class="text-2xl font-semibold text-gray-900">2</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  PlusIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/vue/24/outline'
import { useAlert } from '~/composables/useAlert'
const alert = useAlert()

const viewMode = ref('list')
const selectedStatus = ref('')

const bookings = ref([
  {
    id: 1,
    customer: 'María García',
    customerImage: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop',
    service: 'Mesa para 4 personas',
    date: '2024-01-15',
    time: '14:00',
    status: 'confirmada'
  },
  {
    id: 2,
    customer: 'Juan López',
    customerImage: 'https://images.pexels.com/photos/1040881/pexels-photo-1040881.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop',
    service: 'Mesa para 2 personas',
    date: '2024-01-15',
    time: '19:30',
    status: 'pendiente'
  },
  {
    id: 3,
    customer: 'Ana Rodríguez',
    customerImage: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?auto=compress&cs=tinysrgb&w=50&h=50&fit=crop',
    service: 'Mesa para 6 personas',
    date: '2024-01-16',
    time: '20:00',
    status: 'confirmada'
  }
])

const calendarDays = computed(() => {
  // Simulación de días del calendario
  const days = []
  for (let i = 1; i <= 31; i++) {
    const date = `2024-01-${i.toString().padStart(2, '0')}`
    const dayBookings = bookings.value.filter(b => b.date === date)
    
    days.push({
      date,
      day: i,
      isToday: i === 15,
      isOtherMonth: false,
      bookings: dayBookings
    })
  }
  return days
})

const groupedBookings = computed(() => {
  const groups = new Map()
  
  bookings.value.forEach(booking => {
    if (!groups.has(booking.date)) {
      groups.set(booking.date, {
        date: booking.date,
        dateLabel: formatDate(booking.date),
        bookings: []
      })
    }
    groups.get(booking.date).bookings.push(booking)
  })
  
  return Array.from(groups.values())
})

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function getStatusText(status) {
  const statusMap = {
    'confirmada': 'Confirmada',
    'pendiente': 'Pendiente',
    'cancelada': 'Cancelada'
  }
  return statusMap[status] || status
}

async function handleEdit(booking) {
  const result = await alert.confirm(
    'Editar Reserva',
    `¿Deseas editar la reserva de ${booking.customer}?`,
    'Editar',
    'Cancelar'
  )

  if (result.isConfirmed) {
    alert.loading('Actualizando reserva...')
    setTimeout(() => {
      alert.success('Éxito', 'Reserva actualizada correctamente')
    }, 1500)
  }
}

async function handleCancel(booking) {
  const result = await alert.confirm(
    'Cancelar Reserva',
    `¿Estás seguro de que deseas cancelar la reserva de ${booking.customer}? Esta acción no se puede deshacer.`,
    'Cancelar Reserva',
    'Mantener Reserva'
  )

  if (result.isConfirmed) {
    alert.loading('Cancelando reserva...')
    setTimeout(() => {
      const index = bookings.value.findIndex(b => b.id === booking.id)
      if (index !== -1) {
        bookings.value[index].status = 'cancelada'
      }
      alert.success('Éxito', 'Reserva cancelada correctamente')
    }, 1500)
  }
}
</script>