<template>
  <div
    class="group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden
           hover:shadow-lg hover:-translate-y-0.5 hover:border-red-100
           hover:ring-2 hover:ring-red-500/10
           transition-all duration-300 cursor-pointer flex flex-col"
    @click="$emit('view', product)"
  >
    <!-- Imagen -->
    <div class="relative aspect-[4/3] bg-gray-100 overflow-hidden flex-shrink-0">
      <img
        v-if="product.image && !imgError"
        :src="product.image"
        :alt="product.name"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        @error="imgError = true"
      />
      <div v-else class="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
        <svg class="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </div>

      <!-- Categoría badge (top-left) -->
      <div class="absolute top-2 left-2">
        <span
          class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm"
          :style="{ backgroundColor: product.category?.color || '#ef4444' }"
        >
          {{ product.category?.name }}
        </span>
      </div>

      <!-- Badge Nuevo / Popular (top-right, determinístico) -->
      <div v-if="badge" class="absolute top-2 right-2">
        <span
          class="text-[10px] font-bold px-2 py-0.5 rounded-full text-white shadow-sm"
          :class="badge === 'Nuevo' ? 'bg-emerald-500' : 'bg-orange-500'"
        >
          {{ badge }}
        </span>
      </div>

      <!-- Tiempo preparación (bottom-right) -->
      <div v-if="product.preparationTime" class="absolute bottom-2 right-2">
        <span class="flex items-center gap-1 text-[10px] font-semibold bg-black/60 text-white backdrop-blur-sm px-2 py-0.5 rounded-full">
          <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {{ product.preparationTime }}min
        </span>
      </div>
    </div>

    <!-- Contenido -->
    <div class="p-3 flex flex-col flex-1">
      <!-- Nombre -->
      <h3 class="text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors duration-200 mb-1">
        {{ product.name }}
      </h3>

      <!-- Descripción -->
      <p v-if="product.description" class="text-xs text-gray-400 line-clamp-1 mb-1.5">
        {{ product.description }}
      </p>

      <!-- Restaurante -->
      <div class="flex items-center gap-1 mb-2">
        <svg class="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5"/>
        </svg>
        <NuxtLink
          v-if="product.restaurant?.user?.username"
          :to="`/p/${product.restaurant.user.username}`"
          class="text-[11px] text-red-500 hover:underline font-medium truncate"
          @click.stop
        >{{ product.restaurant?.name }}</NuxtLink>
        <span v-else class="text-[11px] text-gray-400 truncate">{{ product.restaurant?.name }}</span>
      </div>

      <!-- Rating + calorías -->
      <div class="flex items-center gap-1 mb-3">
        <div class="flex items-center gap-0.5">
          <template v-for="(type, i) in ratingStars" :key="i">
            <svg v-if="type === 'full'" class="w-3 h-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
            <svg v-else class="w-3 h-3 text-gray-200" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
            </svg>
          </template>
        </div>
        <span class="text-[11px] font-semibold text-gray-600">{{ simulatedRating }}</span>
        <span v-if="product.calories" class="ml-auto flex items-center gap-0.5 text-[10px] text-gray-400">
          <svg class="w-2.5 h-2.5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67z"/>
          </svg>
          {{ product.calories }} kcal
        </span>
      </div>

      <!-- Footer: precio + botones -->
      <div class="mt-auto flex items-center justify-between gap-2">
        <div>
          <span class="text-base font-black text-red-600">${{ formatPrice(product.price) }}</span>
          <span v-if="product.unit && product.unit !== 'unidad'" class="text-xs text-gray-400 ml-1">/ {{ product.unit }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <!-- Ver detalle -->
          <button
            class="flex items-center justify-center w-8 h-8 text-gray-400 border border-gray-200 rounded-xl hover:bg-gray-50 hover:text-gray-600 transition-all duration-200 active:scale-95"
            title="Ver detalle"
            @click.stop="$emit('view', product)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
          <!-- Pedir -->
          <button
            v-if="!isOwner"
            class="flex items-center gap-1 text-xs font-bold text-white bg-red-600 rounded-xl px-2.5 py-1.5
                   hover:bg-red-700 transition-all duration-200 active:scale-95 shadow-sm shadow-red-200"
            @click.stop="$emit('order', product)"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
            </svg>
            Pedir
          </button>
          <span
            v-else
            class="text-[11px] font-semibold text-gray-400 bg-gray-100 rounded-xl px-2.5 py-1.5"
            title="Este es tu producto"
          >Tu producto</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { CatalogProduct } from '~/composables/useCatalog'

const props = defineProps<{ product: CatalogProduct; isOwner?: boolean }>()
defineEmits<{ view: [product: CatalogProduct]; order: [product: CatalogProduct] }>()

const imgError = ref(false)

// Rating determinístico: basado en el ID del producto (3.8 – 5.0)
const simulatedRating = computed(() => {
  const lastByte = parseInt(props.product.id.slice(-2), 16) || 0
  return (3.8 + (lastByte % 13) * 0.1).toFixed(1)
})

const ratingStars = computed(() =>
  Array.from({ length: 5 }, (_, i) => (i < Math.floor(parseFloat(simulatedRating.value)) ? 'full' : 'empty'))
)

// Badge determinístico (sin campo en DB)
const badge = computed((): 'Nuevo' | 'Popular' | null => {
  const code = (props.product.id.charCodeAt(0) || 0) + (props.product.id.charCodeAt(4) || 0)
  if (code % 7 === 0) return 'Nuevo'
  if (code % 5 === 0) return 'Popular'
  return null
})

function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}
</script>
