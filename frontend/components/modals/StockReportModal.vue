<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="closeModal" class="relative z-50">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black bg-opacity-25" />
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel class="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
              <DialogTitle as="h3" class="text-lg font-medium leading-6 text-gray-900 mb-6">
                Reporte de Stock
              </DialogTitle>

              <!-- Filter Tabs -->
              <div class="flex space-x-4 mb-6 border-b">
                <button
                  @click="filterType = 'todos'"
                  :class="[
                    'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    filterType === 'todos'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  ]"
                >
                  Todos ({{ products.length }})
                </button>
                <button
                  @click="filterType = 'bajo'"
                  :class="[
                    'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    filterType === 'bajo'
                      ? 'border-yellow-500 text-yellow-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  ]"
                >
                  Bajo Stock ({{ lowStockCount }})
                </button>
                <button
                  @click="filterType = 'agotado'"
                  :class="[
                    'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                    filterType === 'agotado'
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  ]"
                >
                  Agotados ({{ outOfStockCount }})
                </button>
              </div>

              <!-- Stats Summary -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-blue-50 rounded-lg p-4">
                  <p class="text-xs text-gray-600 mb-1">Total de Productos</p>
                  <p class="text-2xl font-bold text-blue-600">{{ products.length }}</p>
                </div>
                <div class="bg-yellow-50 rounded-lg p-4">
                  <p class="text-xs text-gray-600 mb-1">Bajo Stock</p>
                  <p class="text-2xl font-bold text-yellow-600">{{ lowStockCount }}</p>
                </div>
                <div class="bg-red-50 rounded-lg p-4">
                  <p class="text-xs text-gray-600 mb-1">Agotados</p>
                  <p class="text-2xl font-bold text-red-600">{{ outOfStockCount }}</p>
                </div>
                <div class="bg-green-50 rounded-lg p-4">
                  <p class="text-xs text-gray-600 mb-1">Valor Total</p>
                  <p class="text-2xl font-bold text-green-600">${{ totalValue.toFixed(2) }}</p>
                </div>
              </div>

              <!-- Table -->
              <div class="overflow-x-auto">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 border-b">
                    <tr>
                      <th class="px-4 py-3 text-left font-medium text-gray-900">Producto</th>
                      <th class="px-4 py-3 text-left font-medium text-gray-900">Categoría</th>
                      <th class="px-4 py-3 text-right font-medium text-gray-900">Precio</th>
                      <th class="px-4 py-3 text-right font-medium text-gray-900">Stock</th>
                      <th class="px-4 py-3 text-right font-medium text-gray-900">Mín/Máx</th>
                      <th class="px-4 py-3 text-right font-medium text-gray-900">Valor</th>
                      <th class="px-4 py-3 text-center font-medium text-gray-900">Estado</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y max-h-96 overflow-y-auto block">
                    <tr
                      v-for="product in filteredProducts"
                      :key="product.id"
                      class="hover:bg-gray-50 border-b"
                    >
                      <td class="px-4 py-3 text-gray-900 font-medium">{{ product.name }}</td>
                      <td class="px-4 py-3 text-gray-600">{{ product.category }}</td>
                      <td class="px-4 py-3 text-right text-gray-900">${{ product.price.toFixed(2) }}</td>
                      <td class="px-4 py-3 text-right font-bold text-gray-900">{{ product.stock }}</td>
                      <td class="px-4 py-3 text-right text-gray-600">{{ product.minStock }}/{{ product.maxStock }}</td>
                      <td class="px-4 py-3 text-right font-bold text-green-600">${{ (product.price * product.stock).toFixed(2) }}</td>
                      <td class="px-4 py-3 text-center">
                        <span
                          :class="[
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            product.stock === 0
                              ? 'bg-red-100 text-red-800'
                              : product.stock <= product.minStock
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          ]"
                        >
                          {{ product.stock === 0 ? 'Agotado' : product.stock <= product.minStock ? 'Bajo' : 'OK' }}
                        </span>
                      </td>
                    </tr>

                    <tr v-if="filteredProducts.length === 0" class="text-center py-8">
                      <td colspan="7" class="px-4 py-8 text-gray-500">
                        No hay productos en esta categoría
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end space-x-3 pt-6 border-t mt-6">
                <button
                  @click="closeModal"
                  type="button"
                  class="btn-secondary"
                >
                  Cerrar
                </button>
                <button
                  @click="exportReport"
                  type="button"
                  class="btn-primary"
                >
                  Exportar PDF
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const props = defineProps({
  isOpen: Boolean,
  products: Array
})

const emit = defineEmits(['close'])

const filterType = ref('todos')

const lowStockCount = computed(() =>
  props.products.filter(p => p.stock > 0 && p.stock <= p.minStock).length
)

const outOfStockCount = computed(() =>
  props.products.filter(p => p.stock === 0).length
)

const totalValue = computed(() =>
  props.products.reduce((sum, p) => sum + (p.price * p.stock), 0)
)

const filteredProducts = computed(() => {
  switch (filterType.value) {
    case 'bajo':
      return props.products.filter(p => p.stock > 0 && p.stock <= p.minStock)
    case 'agotado':
      return props.products.filter(p => p.stock === 0)
    default:
      return props.products
  }
})

const closeModal = () => {
  emit('close')
}

const exportReport = () => {
  const data = filteredProducts.value.map(p => ({
    'Producto': p.name,
    'Categoría': p.category,
    'Precio': `$${p.price.toFixed(2)}`,
    'Stock': p.stock,
    'Mínimo': p.minStock,
    'Máximo': p.maxStock,
    'Valor': `$${(p.price * p.stock).toFixed(2)}`
  }))

  const csv = [
    Object.keys(data[0] || {}).join(','),
    ...data.map(row => Object.values(row).map(v => `"${v}"`).join(','))
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `reporte-stock-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}
</script>
