<template>
  <div>
    <PageHeader
      title="Gestión de Menú"
      description="Organiza y gestiona tu menú de productos"
      :icon="DocumentTextIcon"
      :breadcrumb="breadcrumbItems"
      :stats="headerStats"
    >
      <template #actions>
        <button @click="showCategoryModal = true" class="btn-secondary flex items-center">
          <PlusIcon class="h-5 w-5 mr-2" />
          Nueva Categoría
        </button>
        <button @click="showProductModal = true" class="btn-primary flex items-center">
          <PlusIcon class="h-5 w-5 mr-2" />
          Nuevo Producto
        </button>
      </template>
    </PageHeader>

    <!-- Menu Categories -->
    <div class="space-y-8">
      <div v-for="category in categoriesWithProducts" :key="category.id" class="card p-6">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center">
            <div 
              class="w-4 h-4 rounded-full mr-3"
              :style="{ backgroundColor: category.color }"
            ></div>
            <h2 class="text-xl font-semibold text-gray-900">{{ category.name }}</h2>
            <span class="ml-3 bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm">
              {{ category.products.length }} productos
            </span>
          </div>
          <div class="flex space-x-2">
            <button class="p-2 text-gray-400 hover:text-gray-600">
              <PencilIcon class="h-5 w-5" />
            </button>
            <button class="p-2 text-red-400 hover:text-red-600">
              <TrashIcon class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <ProductCard
            v-for="product in category.products"
            :key="product.id"
            :product="product"
            @edit="editProduct"
            @delete="deleteProduct"
            @toggle-status="toggleProductStatus"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="categoriesWithProducts.length === 0" class="text-center py-12">
      <CubeIcon class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
      <p class="mt-1 text-sm text-gray-500">Comienza agregando tu primer producto al menú.</p>
      <div class="mt-6">
        <button @click="showProductModal = true" class="btn-primary">
          <PlusIcon class="h-5 w-5 mr-2" />
          Agregar Producto
        </button>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { PlusIcon, PencilIcon, TrashIcon, CubeIcon, DocumentTextIcon } from '@heroicons/vue/24/outline'
import { useInventory } from '~/composables/useInventory'
import ProductCard from '~/components/ProductCard.vue'
import ProductModal from '~/components/modals/ProductModal.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
const { products, categories, addProduct, updateProduct, deleteProduct: removeProduct } = useInventory()

const showProductModal = ref(false)
const showCategoryModal = ref(false)
const selectedProduct = ref(null)

const headerStats = computed(() => [
  { label: 'Total Productos', value: products.value.length.toString(), change: '+5', changeType: 'increase' },
  { label: 'Categorías', value: categories.value.length.toString(), change: 'Activas', changeType: 'neutral' },
  { label: 'Disponibles', value: products.value.filter(p => p.status === 'disponible').length.toString(), change: '85%', changeType: 'increase' },
  { label: 'Bajo Stock', value: products.value.filter(p => p.status === 'bajo-stock').length.toString(), change: 'Revisar', changeType: 'decrease' }
])

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Gestión de Menú' }
])

const categoriesWithProducts = computed(() => {
  return categories.value.map(category => ({
    ...category,
    products: products.value.filter(product => product.category === category.name)
  })).filter(category => category.products.length > 0)
})

const editProduct = (product) => {
  selectedProduct.value = product
  showProductModal.value = true
}

const deleteProduct = (productId) => {
  if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
    removeProduct(productId)
  }
}

const toggleProductStatus = (productId) => {
  const product = products.value.find(p => p.id === productId)
  if (product) {
    const newStatus = product.status === 'disponible' ? 'no-disponible' : 'disponible'
    updateProduct(productId, { status: newStatus })
  }
}

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
</script>