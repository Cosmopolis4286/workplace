<template>
  <div class="card p-4 hover:shadow-lg transition-all duration-300">
    <div class="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
      <img 
        :src="product.image" 
        :alt="product.name"
        class="w-full h-full object-cover"
        @error="handleImageError"
      >
      <div class="absolute top-2 right-2">
        <span 
          :class="[
            'inline-flex px-2 py-1 text-xs font-medium rounded-full',
            product.status === 'disponible' ? 'bg-green-100 text-green-800' :
            product.status === 'agotado' ? 'bg-red-100 text-red-800' :
            product.status === 'bajo-stock' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          ]"
        >
          {{ getStatusText(product.status) }}
        </span>
      </div>
    </div>

    <div class="space-y-2">
      <h3 class="font-semibold text-gray-900 text-sm">{{ product.name }}</h3>
      <p class="text-xs text-gray-600">{{ product.description }}</p>
      
      <div class="flex justify-between items-center">
        <div>
          <span class="text-lg font-bold text-ifood-red">${{ product.price }}</span>
          <span class="text-xs text-gray-500 ml-1">/ {{ product.unit }}</span>
          <div v-if="defaultRate && convertLabel(product.price)" class="text-xs text-indigo-500 font-medium mt-0.5">
            ≈ {{ convertLabel(product.price) }} {{ defaultRate.code }}
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-gray-500">Stock: {{ product.stock }}</div>
          <div class="text-xs text-gray-400">Costo: ${{ product.cost }}</div>
        </div>
      </div>

      <!-- Stock indicator -->
      <div class="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          class="h-1.5 rounded-full transition-all duration-300"
          :class="getStockColor()"
          :style="{ width: `${getStockPercentage()}%` }"
        ></div>
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-2">
        <div class="flex space-x-1">
          <button 
            @click="$emit('toggle-status', product.id)"
            :class="[
              'p-1.5 rounded-md text-xs font-medium transition-colors',
              product.status === 'disponible' 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            ]"
          >
            {{ product.status === 'disponible' ? 'Desactivar' : 'Activar' }}
          </button>
        </div>
        
        <div class="flex space-x-1">
          <button 
            @click="$emit('edit', product)"
            class="p-1.5 text-ifood-red hover:text-ifood-darkRed hover:bg-red-50 rounded-md transition-colors"
          >
            <PencilIcon class="h-4 w-4" />
          </button>
          <button 
            @click="$emit('delete', product.id)"
            class="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <TrashIcon class="h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Additional info -->
      <div class="flex justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
        <span>⏱️ {{ product.preparationTime }}min</span>
        <span>🔥 {{ product.calories }}cal</span>
        <span class="text-green-600">💰 {{ getMargin() }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useDefaultRate } from '~/composables/useDefaultRate'

const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

const { defaultRate, convertLabel, load } = useDefaultRate()
onMounted(load)

defineEmits(['edit', 'delete', 'toggle-status'])

const getStatusText = (status) => {
  const statusMap = {
    'disponible': 'Disponible',
    'agotado': 'Agotado',
    'bajo-stock': 'Bajo Stock',
    'no-disponible': 'No Disponible'
  }
  return statusMap[status] || status
}

const getStockPercentage = () => {
  if (!props.product.maxStock) return 100
  return Math.min((props.product.stock / props.product.maxStock) * 100, 100)
}

const getStockColor = () => {
  const percentage = getStockPercentage()
  if (percentage <= 20) return 'bg-red-500'
  if (percentage <= 50) return 'bg-yellow-500'
  return 'bg-green-500'
}

const getMargin = () => {
  if (!props.product.cost || !props.product.price) return 0
  return Math.round(((props.product.price - props.product.cost) / props.product.price) * 100)
}

const handleImageError = (event) => {
  event.target.src = 'https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
}
</script>