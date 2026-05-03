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

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
      {{ error }}
    </div>

    <!-- Inventory Content -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Products List -->
      <div class="lg:col-span-3">
        <div class="card p-6">
          <h3 class="text-lg font-medium text-gray-900 mb-4">Lista de Productos</h3>

          <!-- Loading skeleton -->
          <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div
              v-for="n in 6"
              :key="n"
              class="border rounded-lg p-4 animate-pulse"
            >
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div class="h-3 bg-gray-200 rounded w-1/2 mb-4" />
              <div class="flex justify-between">
                <div class="h-5 bg-gray-200 rounded w-1/4" />
                <div class="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div
            v-else-if="products.length === 0"
            class="text-center py-12 text-gray-400"
          >
            <CubeIcon class="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p class="text-sm">No hay productos. Agrega el primero.</p>
          </div>

          <!-- Product cards -->
          <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div
              v-for="product in products"
              :key="product.id"
              class="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              @click="openEditProduct(product)"
            >
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900 truncate mr-2">{{ product.name }}</h4>
                <span :class="statusClass(product.status)" class="text-xs font-medium whitespace-nowrap">
                  {{ statusLabel(product.status) }}
                </span>
              </div>
              <p class="text-sm text-gray-500 mb-3 truncate">
                {{ product.category?.name ?? '—' }}
              </p>
              <div class="flex items-center justify-between">
                <span class="text-lg font-bold text-gray-900">${{ product.price.toFixed(2) }}</span>
                <span :class="product.stock <= product.minStock ? 'text-red-600' : 'text-gray-600'" class="text-sm font-medium">
                  Stock: {{ product.stock }}
                </span>
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

        <!-- Stock alerts -->
        <div v-if="lowStockProducts.length > 0 || outOfStockProducts.length > 0" class="mt-6">
          <h4 class="text-sm font-medium text-gray-700 mb-2">Alertas</h4>
          <div v-if="outOfStockProducts.length > 0" class="text-xs text-red-600 bg-red-50 rounded p-2 mb-2">
            {{ outOfStockProducts.length }} producto(s) agotado(s)
          </div>
          <div v-if="lowStockProducts.length > 0" class="text-xs text-yellow-700 bg-yellow-50 rounded p-2">
            {{ lowStockProducts.length }} producto(s) con bajo stock
          </div>
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
      @update="handleUpdateCategory"
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
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import {
  CubeIcon,
  ArrowDownIcon,
  PlusIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import ProductModal from '~/components/modals/ProductModal.vue'
import CategoryModal from '~/components/modals/CategoryModal.vue'
import StockReportModal from '~/components/modals/StockReportModal.vue'
import { useInventory } from '~/composables/useInventory'

const {
  products,
  categories,
  loading,
  error,
  lowStockProducts,
  outOfStockProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  addCategory,
  updateCategory,
  deleteCategory,
  init,
} = useInventory()

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Inventario' },
])

const showProductModal = ref(false)
const selectedProduct = ref(null)
const showCategoryModal = ref(false)
const showStockReportModal = ref(false)

onMounted(() => init())

const headerStats = computed(() => [
  {
    label: 'Total Productos',
    value: products.value.length.toString(),
    change: '',
    changeType: 'neutral',
  },
  {
    label: 'Valor Inventario',
    value: `$${products.value.reduce((s, p) => s + p.price * p.stock, 0).toFixed(2)}`,
    change: '',
    changeType: 'neutral',
  },
  {
    label: 'Bajo Stock',
    value: lowStockProducts.value.length.toString(),
    change: '',
    changeType: lowStockProducts.value.length > 0 ? 'decrease' : 'neutral',
  },
  {
    label: 'Agotados',
    value: outOfStockProducts.value.length.toString(),
    change: '',
    changeType: outOfStockProducts.value.length > 0 ? 'decrease' : 'neutral',
  },
])

function statusLabel(status) {
  const map = {
    DISPONIBLE: 'Disponible',
    BAJO_STOCK: 'Bajo Stock',
    AGOTADO: 'Agotado',
    NO_DISPONIBLE: 'No disponible',
  }
  return map[status] ?? status
}

function statusClass(status) {
  const map = {
    DISPONIBLE: 'text-green-600',
    BAJO_STOCK: 'text-yellow-600',
    AGOTADO: 'text-red-600',
    NO_DISPONIBLE: 'text-gray-400',
  }
  return map[status] ?? 'text-gray-500'
}

function openEditProduct(product) {
  selectedProduct.value = product
  showProductModal.value = true
}

async function saveProduct(productData) {
  if (selectedProduct.value) {
    await updateProduct(selectedProduct.value.id, productData)
  } else {
    await addProduct(productData)
  }
  closeProductModal()
}

function closeProductModal() {
  showProductModal.value = false
  selectedProduct.value = null
}

function closeCategoryModal() {
  showCategoryModal.value = false
}

async function handleAddCategory(category) {
  await addCategory(category)
}

async function handleUpdateCategory(id, data) {
  await updateCategory(id, data)
}

async function handleDeleteCategory(category) {
  await deleteCategory(category.id)
}

function closeStockReportModal() {
  showStockReportModal.value = false
}
</script>
