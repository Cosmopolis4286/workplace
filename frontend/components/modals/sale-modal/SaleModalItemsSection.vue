<template>
  <div class="px-6 py-4">
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-semibold text-gray-700">Productos</h4>
      <button type="button" class="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1" @click="$emit('add-item')">
        <PlusIcon class="h-4 w-4" />
        Agregar
      </button>
    </div>

    <!-- Product selector (quick add from catalog) -->
    <div v-if="products.length > 0" class="mb-3">
      <div class="relative">
        <input
          :value="productSearch"
          type="text"
          class="input-field pr-8"
          placeholder="Buscar producto del catálogo..."
          @input="$emit('update:productSearch', ($event.target as HTMLInputElement).value)"
          @focus="$emit('update:showProductDropdown', true)"
          @blur="$emit('hide-dropdown-delayed')"
        />
        <MagnifyingGlassIcon class="h-4 w-4 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
      </div>
      <div
        v-if="showProductDropdown && filteredProducts.length > 0"
        class="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10 relative"
      >
        <button
          v-for="p in filteredProducts"
          :key="p.id"
          type="button"
          class="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center justify-between"
          @mousedown.prevent="$emit('select-product', p)"
        >
          <span>{{ p.name }}</span>
          <span class="text-gray-500 text-xs">{{ formatCurrency(p.price) }}</span>
        </button>
      </div>
    </div>

    <!-- Items list -->
    <div v-if="items.length === 0" class="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
      Sin productos. Agrega items al pedido.
    </div>
    <div v-else class="space-y-2">
      <div v-for="(item, idx) in items" :key="idx" class="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
        <div class="flex-1 grid grid-cols-6 gap-2 items-center">
          <div class="col-span-3">
            <input
              v-model="item.productName"
              type="text"
              class="input-field text-sm py-1.5"
              placeholder="Nombre del producto"
              required
            />
          </div>
          <div class="col-span-1">
            <input
              v-model.number="item.quantity"
              type="number"
              min="1"
              class="input-field text-sm py-1.5 text-center"
              required
              @input="$emit('update-subtotal', idx)"
            />
          </div>
          <div class="col-span-2">
            <div class="relative">
              <span class="absolute left-2.5 top-1.5 text-gray-400 text-sm">$</span>
              <input
                v-model.number="item.unitPrice"
                type="number"
                min="0"
                step="0.01"
                class="input-field text-sm py-1.5 pl-6"
                required
                @input="$emit('update-subtotal', idx)"
              />
            </div>
          </div>
        </div>
        <button type="button" class="p-1.5 text-gray-400 hover:text-red-500 mt-0.5" @click="$emit('remove-item', idx)">
          <XMarkIcon class="h-4 w-4" />
        </button>
      </div>

      <!-- Column labels -->
      <div class="grid grid-cols-6 gap-2 px-2 text-xs text-gray-400">
        <span class="col-span-3">Producto</span>
        <span class="col-span-1 text-center">Cant.</span>
        <span class="col-span-2">Precio Unit.</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import type { Product } from '~/composables/catalog/useMenu'

export interface SaleModalFormItem {
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
}

defineProps<{
  items: SaleModalFormItem[]
  products: Product[]
  filteredProducts: Product[]
  productSearch: string
  showProductDropdown: boolean
  formatCurrency: (v: number) => string
}>()

defineEmits<{
  'add-item': []
  'remove-item': [idx: number]
  'update-subtotal': [idx: number]
  'select-product': [product: Product]
  'update:productSearch': [value: string]
  'update:showProductDropdown': [value: boolean]
  'hide-dropdown-delayed': []
}>()
</script>
