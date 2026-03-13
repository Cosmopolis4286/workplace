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
        <button @click="openCreateProduct" class="btn-primary flex items-center">
          <PlusIcon class="h-5 w-5 mr-2" />
          Nuevo Producto
        </button>
      </template>
    </PageHeader>

    <!-- Plan usage banner -->
    <PlanUsageBanner :usage="usage" :show="['products']" />

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-sm text-red-700">{{ error }}</p>
      <button @click="error = null" class="text-red-500 hover:text-red-700">
        <XMarkIcon class="h-5 w-5" />
      </button>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="space-y-8">
      <div v-for="n in 2" :key="n" class="card p-6 animate-pulse">
        <div class="h-6 bg-gray-200 rounded w-48 mb-6"></div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div v-for="m in 4" :key="m" class="h-64 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    </div>

    <!-- Menu Categories -->
    <div v-else class="space-y-8">
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
            <button
              @click="openEditCategory(category)"
              class="p-2 text-gray-400 hover:text-gray-600"
              title="Editar categoría"
            >
              <PencilIcon class="h-5 w-5" />
            </button>
            <button
              @click="confirmDeleteCategory(category)"
              class="p-2 text-red-400 hover:text-red-600"
              title="Eliminar categoría"
            >
              <TrashIcon class="h-5 w-5" />
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <ProductCard
            v-for="product in category.products"
            :key="product.id"
            :product="product"
            @edit="openEditProduct"
            @delete="confirmDeleteProduct"
            @toggle-status="handleToggleStatus"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="categoriesWithProducts.length === 0" class="text-center py-12">
        <CubeIcon class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">No hay productos</h3>
        <p class="mt-1 text-sm text-gray-500">Comienza agregando una categoría y tu primer producto.</p>
        <div class="mt-6 flex justify-center gap-3">
          <button @click="showCategoryModal = true" class="btn-secondary">
            Nueva Categoría
          </button>
          <button @click="openCreateProduct" class="btn-primary flex items-center">
            <PlusIcon class="h-5 w-5 mr-2" />
            Agregar Producto
          </button>
        </div>
      </div>
    </div>

    <!-- Category Modal -->
    <CategoryModal
      :is-open="showCategoryModal"
      :categories="categories"
      :saving="savingCategory"
      :edit-category="selectedCategory"
      @close="closeCategoryModal"
      @add="handleAddCategory"
      @update="handleUpdateCategory"
      @delete="confirmDeleteCategory"
    />

    <!-- Product Modal -->
    <ProductModal
      :is-open="showProductModal"
      :product="selectedProduct"
      :categories="categories"
      @close="closeProductModal"
      @save="handleSaveProduct"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { useMenu } from '~/composables/useMenu'
import type { Category, Product } from '~/composables/useMenu'
import { usePlans } from '~/composables/usePlans'
import ProductCard from '~/components/ProductCard.vue'
import ProductModal from '~/components/modals/ProductModal.vue'
import CategoryModal from '~/components/modals/CategoryModal.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import PlanUsageBanner from '~/components/PlanUsageBanner.vue'

const {
  categories,
  products,
  loading,
  error,
  categoriesWithProducts,
  totalProducts,
  availableProducts,
  lowStockProducts,
  loadMenu,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
} = useMenu()

// ─── Modals state ────────────────────────────────────────────────────────────

const showProductModal = ref(false)
const showCategoryModal = ref(false)
const selectedProduct = ref<Product | null>(null)
const selectedCategory = ref<Category | null>(null)
const savingCategory = ref(false)

// ─── Header stats ────────────────────────────────────────────────────────────

const headerStats = computed(() => [
  { label: 'Total Productos', value: totalProducts.value.toString(), change: '', changeType: 'neutral' },
  { label: 'Categorías', value: categories.value.length.toString(), change: 'Activas', changeType: 'neutral' },
  { label: 'Disponibles', value: availableProducts.value.toString(), change: '', changeType: 'increase' },
  {
    label: 'Bajo Stock',
    value: lowStockProducts.value.length.toString(),
    change: lowStockProducts.value.length > 0 ? 'Revisar' : 'OK',
    changeType: lowStockProducts.value.length > 0 ? 'decrease' : 'increase',
  },
])

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Gestión de Menú' },
])

// ─── Category handlers ───────────────────────────────────────────────────────

const openEditCategory = (category: Category) => {
  selectedCategory.value = category
  showCategoryModal.value = true
}

const closeCategoryModal = () => {
  showCategoryModal.value = false
  selectedCategory.value = null
}

const handleAddCategory = async (data: { name: string; color?: string }) => {
  savingCategory.value = true
  await createCategory(data)
  savingCategory.value = false
}

const handleUpdateCategory = async (id: string, data: { name?: string; color?: string }) => {
  savingCategory.value = true
  await updateCategory(id, data)
  savingCategory.value = false
}

const confirmDeleteCategory = async (category: Category) => {
  const productCount = categoriesWithProducts.value.find((c) => c.id === category.id)?.products.length ?? 0
  if (productCount > 0) {
    alert(`La categoría "${category.name}" tiene ${productCount} producto(s). Muévalos o elimínelos primero.`)
    return
  }
  if (confirm(`¿Eliminar la categoría "${category.name}"?`)) {
    await deleteCategory(category.id)
  }
}

// ─── Product handlers ─────────────────────────────────────────────────────────

const openCreateProduct = () => {
  selectedProduct.value = null
  showProductModal.value = true
}

const openEditProduct = (product: Product) => {
  selectedProduct.value = product
  showProductModal.value = true
}

const closeProductModal = () => {
  showProductModal.value = false
  selectedProduct.value = null
}

const handleSaveProduct = async (productData: Partial<Product>) => {
  if (selectedProduct.value) {
    await updateProduct(selectedProduct.value.id, productData)
  } else {
    await createProduct(productData)
  }
  closeProductModal()
}

const confirmDeleteProduct = async (productId: string) => {
  if (confirm('¿Estás seguro de que quieres eliminar este producto?')) {
    await deleteProduct(productId)
  }
}

const handleToggleStatus = async (productId: string) => {
  await toggleProductStatus(productId)
}

// ─── Init ─────────────────────────────────────────────────────────────────────

const { usage, fetchUsage } = usePlans()

onMounted(() => {
  loadMenu()
  fetchUsage()
})
</script>
