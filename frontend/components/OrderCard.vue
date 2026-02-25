<template>
  <div class="card p-6 hover:shadow-lg transition-all duration-300">
    <div class="flex justify-between items-start mb-4">
      <div class="flex items-center space-x-3">
        <div class="flex-shrink-0">
          <img 
            :src="order.customerImage" 
            :alt="order.customerName"
            class="h-12 w-12 rounded-full object-cover"
          >
        </div>
        <div>
          <h3 class="text-lg font-semibold text-gray-900">{{ order.customerName }}</h3>
          <p class="text-sm text-gray-500">Pedido #{{ order.id }}</p>
        </div>
      </div>
      
      <div class="text-right">
        <span 
          :class="[
            'inline-flex px-3 py-1 text-xs font-medium rounded-full',
            getStatusClasses(order.status)
          ]"
        >
          {{ getStatusText(order.status) }}
        </span>
        <p class="text-sm text-gray-500 mt-1">{{ formatTime(order.createdAt) }}</p>
      </div>
    </div>

    <!-- Order Items -->
    <div class="space-y-2 mb-4">
      <div v-for="item in order.items" :key="item.id" class="flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <span class="text-sm font-medium text-gray-900">{{ item.quantity }}x</span>
          <span class="text-sm text-gray-700">{{ item.name }}</span>
        </div>
        <span class="text-sm font-medium text-gray-900">${{ item.price * item.quantity }}</span>
      </div>
    </div>

    <!-- Order Summary -->
    <div class="border-t border-gray-200 pt-4">
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-gray-600">Subtotal:</span>
        <span class="text-sm font-medium">${{ order.subtotal }}</span>
      </div>
      <div class="flex justify-between items-center mb-2">
        <span class="text-sm text-gray-600">Delivery:</span>
        <span class="text-sm font-medium">${{ order.deliveryFee }}</span>
      </div>
      <div class="flex justify-between items-center font-semibold text-lg">
        <span>Total:</span>
        <span class="text-ifood-red">${{ order.total }}</span>
      </div>
    </div>

    <!-- Delivery Info -->
    <div v-if="order.deliveryAddress" class="mt-4 p-3 bg-gray-50 rounded-lg">
      <div class="flex items-center space-x-2 mb-2">
        <MapPinIcon class="h-4 w-4 text-gray-500" />
        <span class="text-sm font-medium text-gray-700">Dirección de entrega:</span>
      </div>
      <p class="text-sm text-gray-600">{{ order.deliveryAddress }}</p>
      <div class="flex items-center space-x-4 mt-2">
        <div class="flex items-center space-x-1">
          <ClockIcon class="h-4 w-4 text-gray-500" />
          <span class="text-xs text-gray-500">ETA: {{ order.estimatedTime }}min</span>
        </div>
        <div v-if="order.driverName" class="flex items-center space-x-1">
          <TruckIcon class="h-4 w-4 text-gray-500" />
          <span class="text-xs text-gray-500">{{ order.driverName }}</span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
      <div class="flex space-x-2">
        <button 
          v-if="order.status === 'pendiente'"
          @click="$emit('accept', order.id)"
          class="btn-success text-xs py-1 px-3"
        >
          Aceptar
        </button>
        <button 
          v-if="order.status === 'aceptado'"
          @click="$emit('start-preparation', order.id)"
          class="btn-warning text-xs py-1 px-3"
        >
          Iniciar Preparación
        </button>
        <button 
          v-if="order.status === 'preparando'"
          @click="$emit('ready', order.id)"
          class="btn-primary text-xs py-1 px-3"
        >
          Listo
        </button>
        <button 
          v-if="order.status === 'listo' && order.type === 'delivery'"
          @click="$emit('dispatch', order.id)"
          class="btn-secondary text-xs py-1 px-3"
        >
          Enviar
        </button>
      </div>
      
      <div class="flex space-x-2">
        <button 
          @click="$emit('view-details', order)"
          class="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
        >
          <EyeIcon class="h-4 w-4" />
        </button>
        <button 
          v-if="['pendiente', 'aceptado'].includes(order.status)"
          @click="$emit('cancel', order.id)"
          class="p-2 text-red-400 hover:text-red-600 rounded-md hover:bg-red-50"
        >
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { 
  MapPinIcon, 
  ClockIcon, 
  TruckIcon, 
  EyeIcon, 
  XMarkIcon 
} from '@heroicons/vue/24/outline'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const props = defineProps({
  order: {
    type: Object,
    required: true
  }
})

defineEmits(['accept', 'start-preparation', 'ready', 'dispatch', 'cancel', 'view-details'])

const getStatusText = (status) => {
  const statusMap = {
    'pendiente': 'Pendiente',
    'aceptado': 'Aceptado',
    'preparando': 'Preparando',
    'listo': 'Listo',
    'enviado': 'Enviado',
    'entregado': 'Entregado',
    'cancelado': 'Cancelado'
  }
  return statusMap[status] || status
}

const getStatusClasses = (status) => {
  const classes = {
    'pendiente': 'bg-yellow-100 text-yellow-800',
    'aceptado': 'bg-blue-100 text-blue-800',
    'preparando': 'bg-orange-100 text-orange-800',
    'listo': 'bg-green-100 text-green-800',
    'enviado': 'bg-purple-100 text-purple-800',
    'entregado': 'bg-green-100 text-green-800',
    'cancelado': 'bg-red-100 text-red-800'
  }
  return classes[status] || 'bg-gray-100 text-gray-800'
}

const formatTime = (date) => {
  return format(new Date(date), 'HH:mm', { locale: es })
}
</script>