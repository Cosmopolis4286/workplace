<template>
  <div
    class="card p-4 transition-all duration-300 relative"
    :class="selected ? 'ring-2 ring-workplace-red shadow-lg' : 'hover:shadow-lg'"
  >
    <label
      v-if="selectable"
      class="absolute top-2 left-2 z-10 flex items-center justify-center w-6 h-6 rounded-md bg-white/90 shadow cursor-pointer"
    >
      <input
        type="checkbox"
        :checked="selected"
        class="h-4 w-4 rounded border-gray-300 text-workplace-red focus:ring-workplace-red"
        @change="$emit('toggle-select', product.id)"
      />
    </label>

    <div class="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
      <img
        :src="product.image"
        :alt="product.name"
        class="w-full h-full object-cover"
        @error="handleImageError"
      >
      <div class="absolute top-2 left-2" v-if="product.isBundle && !selectable">
        <span class="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-full bg-purple-100 text-purple-700">
          📦 Pack
        </span>
      </div>
      <div class="absolute top-2 right-2">
        <span
          :class="[
            'inline-flex px-2 py-1 text-xs font-medium rounded-full',
            product.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
            product.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-800' :
            product.status === 'LOW_STOCK' ? 'bg-yellow-100 text-yellow-800' :
            'bg-gray-100 text-gray-800'
          ]"
        >
          {{ getStatusText(product.status) }}
        </span>
      </div>
    </div>

    <div class="space-y-2">
      <div class="flex items-center gap-1.5">
        <span v-if="product.isBundle && selectable" class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-700">
          📦 Pack
        </span>
        <h3 class="font-semibold text-gray-900 text-sm">{{ product.name }}</h3>
      </div>
      <p class="text-xs text-gray-600">{{ product.description }}</p>

      <div class="flex justify-between items-center">
        <div>
          <span class="text-lg font-bold text-workplace-red">${{ product.price }}</span>
          <span class="text-xs text-gray-500 ml-1">/ {{ product.unit }}</span>
          <div v-if="defaultRate && convertLabel(product.price)" class="text-xs text-indigo-500 font-medium mt-0.5">
            ≈ {{ convertLabel(product.price) }} {{ defaultRate.code }}
          </div>
        </div>
        <div class="text-right">
          <template v-if="product.isBundle">
            <div class="text-xs text-gray-500">{{ product.bundleItems?.length ?? 0 }} productos</div>
          </template>
          <template v-else>
            <div class="text-xs text-gray-500">Stock: {{ product.stock }}</div>
            <div class="text-xs text-gray-400">Costo: ${{ product.cost }}</div>
          </template>
        </div>
      </div>

      <!-- Stock indicator: el stock de un pack vive en sus componentes -->
      <div v-if="!product.isBundle" class="w-full bg-gray-200 rounded-full h-1.5">
        <div
          class="h-1.5 rounded-full transition-all duration-300"
          :class="stockColor"
          :style="{ width: `${stockPercentage}%` }"
        ></div>
      </div>

      <!-- Actions -->
      <div class="flex justify-between items-center pt-2">
        <div class="flex space-x-1">
          <button
            @click="$emit('toggle-status', product.id)"
            :class="[
              'p-1.5 rounded-md text-xs font-medium transition-colors',
              product.status === 'AVAILABLE'
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            ]"
          >
            {{ product.status === 'AVAILABLE' ? 'Desactivar' : 'Activar' }}
          </button>
        </div>

        <div class="flex space-x-1">
          <button
            @click="$emit('edit', product)"
            class="p-1.5 text-workplace-red hover:text-workplace-darkRed hover:bg-red-50 rounded-md transition-colors"
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
        <span class="text-green-600">💰 {{ margin }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { useDefaultRate } from '~/composables/wallets/useDefaultRate'
import type { Product } from '~/composables/catalog/useMenu'

const props = withDefaults(defineProps<{
  product: Product
  selectable?: boolean
  selected?: boolean
}>(), {
  selectable: false,
  selected: false,
})

const { defaultRate, convertLabel, load } = useDefaultRate()
onMounted(load)

defineEmits<{
  edit: [product: Product]
  delete: [productId: string]
  'toggle-status': [productId: string]
  'toggle-select': [productId: string]
}>()

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Disponible',
  OUT_OF_STOCK: 'Agotado',
  LOW_STOCK: 'Bajo Stock',
  UNAVAILABLE: 'No Disponible',
}
function getStatusText(status: string): string {
  return STATUS_LABELS[status] ?? status
}

const stockPercentage = computed(() => {
  if (!props.product.maxStock) return 100
  return Math.min((props.product.stock / props.product.maxStock) * 100, 100)
})

const stockColor = computed(() => {
  if (stockPercentage.value <= 20) return 'bg-red-500'
  if (stockPercentage.value <= 50) return 'bg-yellow-500'
  return 'bg-green-500'
})

const margin = computed(() => {
  if (!props.product.cost || !props.product.price) return 0
  return Math.round(((props.product.price - props.product.cost) / props.product.price) * 100)
})

function handleImageError(event: Event) {
  const target = event.target as HTMLImageElement
  target.src = 'https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop'
}
</script>
