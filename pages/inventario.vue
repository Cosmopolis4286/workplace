<template>
  <div>
    <PageHeader
      title="Gestión de Inventario"
      description="Control completo de productos y stock"
      :icon="CubeIcon"
      :breadcrumb="breadcrumbItems"
      :stats="headerStats"
    >
      <template #actions>
        <button class="btn-secondary flex items-center">
          <ArrowDownIcon class="h-5 w-5 mr-2" />
          Exportar
        </button>
        <button @click="showProductModal = true" class="btn-primary flex items-center">
          <PlusIcon class="h-5 w-5 mr-2" />
          Agregar Producto
        </button>
      </template>
    </PageHeader>

    <!-- Inventory Content -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Products List -->
      <div class="lg:col-span-3">
        <div class="card p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Lista de Productos</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900">Hamburguesa Clásica</h4>
                <span class="text-sm text-green-600 font-medium">En Stock</span>
              </div>
              <p class="text-sm text-gray-500 mb-2">Categoría: Hamburguesas</p>
              <div class="flex items-center justify-between">
                <span class="text-lg font-bold text-gray-900">$12.99</span>
                <span class="text-sm text-gray-600">Stock: 45</span>
              </div>
            </div>
            
            <div class="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900">Pizza Margherita</h4>
                <span class="text-sm text-yellow-600 font-medium">Bajo Stock</span>
              </div>
              <p class="text-sm text-gray-500 mb-2">Categoría: Pizzas</p>
              <div class="flex items-center justify-between">
                <span class="text-lg font-bold text-gray-900">$18.50</span>
                <span class="text-sm text-red-600">Stock: 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card p-6">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Acciones Rápidas</h3>
        <div class="space-y-3">
          <button @click="showProductModal = true" class="w-full btn-primary">
            Agregar Producto
          </button>
          <button @click="showCategoryModal = true" class="w-full btn-secondary">
            Gestionar Categorías
          </button>
          <button @click="showStockReportModal = true" class="w-full btn-secondary">
            Reporte de Stock
          </button>
        </div>
      </div>
    </div>

    <!-- Product Modal -->
    <ProductModal
      :is-open="showProductModal"
      :product="selectedProduct"
      :categories="categories"
      @close="closeProductModal"
      @save="saveProduct"
    />

    <!-- Category Modal -->
    <CategoryModal
      :is-open="showCategoryModal"
      :categories="categories"
      @close="closeCategoryModal"
      @add="handleAddCategory"
      @delete="handleDeleteCategory"
    />

    <!-- Stock Report Modal -->
    <StockReportModal
      :is-open="showStockReportModal"
      :products="products"
      @close="closeStockReportModal"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import {
  CubeIcon,
  ArrowDownIcon,
  PlusIcon
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import ProductModal from '~/components/modals/ProductModal.vue'
import CategoryModal from '~/components/modals/CategoryModal.vue'
import StockReportModal from '~/components/modals/StockReportModal.vue'
import { useInventory } from '~/composables/useInventory'

definePageMeta({
  layout: 'default'
})

const { products, categories, addProduct, updateProduct, deleteProduct: removeProduct, addCategory, deleteCategory } = useInventory()

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Inventario' }
])

const showProductModal = ref(false)
const selectedProduct = ref(null)
const showCategoryModal = ref(false)
const showStockReportModal = ref(false)

const headerStats = computed(() => {
  const totalProducts = products.value.length
  const totalValue = products.value.reduce((sum, product) => sum + (product.price * product.stock), 0)
  const lowStockProducts = products.value.filter(p => p.stock > 0 && p.stock <= 5).length
  const outOfStockProducts = products.value.filter(p => p.stock === 0).length

  return [
    { label: 'Total Productos', value: totalProducts.toString(), change: '+2.1%', changeType: 'increase' },
    { label: 'Valor Inventario', value: `$${totalValue.toFixed(2)}`, change: '+5.4%', changeType: 'increase' },
    { label: 'Bajo Stock', value: lowStockProducts.toString(), change: '-12.3%', changeType: 'decrease' },
    { label: 'Agotados', value: outOfStockProducts.toString(), change: '0%', changeType: 'neutral' }
  ]
})

const saveProduct = (productData) => {
  if (selectedProduct.value) {
    updateProduct(selectedProduct.value.id, productData)
  } else {
    addProduct(productData)
  }
}

const closeProductModal = () => {
  showProductModal.value = false
  selectedProduct.value = null
}

const closeCategoryModal = () => {
  showCategoryModal.value = false
}

const handleAddCategory = (category) => {
  addCategory(category)
}

const handleDeleteCategory = (id) => {
  deleteCategory(id)
}

const closeStockReportModal = () => {
  showStockReportModal.value = false
}
</script>