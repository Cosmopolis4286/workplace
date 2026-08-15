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
        <HeaderActionButton :icon="ArrowDownTrayIcon" @click="exportCSV">
          Exportar
        </HeaderActionButton>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openCreateProduct">
          Agregar Producto
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-2">
      <ExclamationTriangleIcon class="h-5 w-5 flex-shrink-0 mt-0.5" />
      <span>{{ error }}</span>
    </div>

    <!-- Toast -->
    <Transition name="fade">
      <div
        v-if="toast"
        class="fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium"
        :class="toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'"
      >
        {{ toast.message }}
      </div>
    </Transition>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Main content -->
      <div class="lg:col-span-3 space-y-4">
        <InventoryFiltersBar
          :search="search"
          :filter-category="filterCategory"
          :filter-status="filterStatus"
          :view-mode="viewMode"
          :categories="categories"
          @update:search="search = $event"
          @update:filter-category="filterCategory = $event"
          @update:filter-status="filterStatus = $event"
          @update:view-mode="viewMode = $event"
        />

        <ProductsPanel
          :products="filteredProducts"
          :loading="loading"
          :view-mode="viewMode"
          :saving-stock="savingStock"
          :has-any-products="products.length > 0"
          :status-label="statusLabel"
          :status-badge-class="statusBadgeClass"
          @create="openCreateProduct"
          @edit="openEditProduct"
          @delete="confirmDelete"
          @toggle-status="handleToggleStatus"
          @adjust-stock="adjustStock"
        />
      </div>

      <InventorySidebar
        :out-of-stock-count="outOfStockProducts.length"
        :low-stock-count="lowStockProducts.length"
        :category-breakdown="categoryBreakdown"
        :filter-category="filterCategory"
        :loading="loading"
        @create-product="openCreateProduct"
        @open-categories="showCategoryModal = true"
        @open-stock-report="showStockReportModal = true"
        @update:filter-status="filterStatus = $event"
        @update:filter-category="filterCategory = $event"
      />
    </div>

    <!-- Delete confirm dialog -->
    <DeleteProductDialog
      :product="productToDelete"
      :deleting="deleting"
      @close="productToDelete = null"
      @confirm="handleDelete"
    />

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
      @close="showStockReportModal = false"
    />
  </div>
</template>

<script setup>
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'
import {
  CubeIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  ExclamationTriangleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import InventoryFiltersBar from '~/components/inventory/InventoryFiltersBar.vue'
import ProductsPanel from '~/components/inventory/ProductsPanel.vue'
import InventorySidebar from '~/components/inventory/InventorySidebar.vue'
import DeleteProductDialog from '~/components/inventory/DeleteProductDialog.vue'
import ProductModal from '~/components/modals/ProductModal.vue'
import CategoryModal from '~/components/modals/CategoryModal.vue'
import StockReportModal from '~/components/modals/StockReportModal.vue'
import { useMenu } from '~/composables/catalog/useMenu'

const {
  products,
  categories,
  loading,
  error,
  lowStockProducts,
  outOfStockProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  updateStock,
  toggleProductStatus,
  init,
} = useMenu()

// ─── Local state ────────────────────────────────────────────────────────────

const search = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const viewMode = ref('grid')

const showProductModal = ref(false)
const selectedProduct = ref(null)
const showCategoryModal = ref(false)
const showStockReportModal = ref(false)
const productToDelete = ref(null)
const deleting = ref(false)
const savingStock = ref({})
const toast = ref(null)

const breadcrumbItems = ref([
  { label: 'Dashboard', to: '/' },
  { label: 'Inventario' },
])

// ─── Computed ────────────────────────────────────────────────────────────────

const filteredProducts = computed(() => {
  let list = products.value
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.category?.name.toLowerCase().includes(q)
    )
  }
  if (filterCategory.value) {
    list = list.filter(p => p.categoryId === filterCategory.value)
  }
  if (filterStatus.value) {
    list = list.filter(p => p.status === filterStatus.value)
  }
  return list
})

const categoryBreakdown = computed(() =>
  categories.value.map(cat => ({
    ...cat,
    count: products.value.filter(p => p.categoryId === cat.id).length,
  })).filter(c => c.count > 0)
)

const headerStats = computed(() => {
  const totalValue = products.value.reduce((s, p) => s + p.price * p.stock, 0)
  const totalCost = products.value.reduce((s, p) => s + p.cost * p.stock, 0)
  return [
    { label: 'Total Productos', value: products.value.length.toString(), change: '', changeType: 'neutral' },
    { label: 'Valor Inventario', value: `$${totalValue.toFixed(2)}`, change: '', changeType: 'neutral' },
    { label: 'Bajo Stock', value: lowStockProducts.value.length.toString(), change: '', changeType: lowStockProducts.value.length > 0 ? 'decrease' : 'neutral' },
    { label: 'Agotados', value: outOfStockProducts.value.length.toString(), change: '', changeType: outOfStockProducts.value.length > 0 ? 'decrease' : 'neutral' },
  ]
})

// ─── Lifecycle ───────────────────────────────────────────────────────────────

onMounted(() => init())

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusLabel(status) {
  return { AVAILABLE: 'Disponible', LOW_STOCK: 'Bajo Stock', OUT_OF_STOCK: 'Agotado', UNAVAILABLE: 'No disponible' }[status] ?? status
}

function statusBadgeClass(status) {
  return {
    AVAILABLE: 'bg-green-100 text-green-700',
    LOW_STOCK: 'bg-yellow-100 text-yellow-700',
    OUT_OF_STOCK: 'bg-red-100 text-red-700',
    UNAVAILABLE: 'bg-gray-100 text-gray-500',
  }[status] ?? 'bg-gray-100 text-gray-500'
}

function showToast(message, type = 'success') {
  toast.value = { message, type }
  setTimeout(() => (toast.value = null), 3000)
}

// ─── Product actions ─────────────────────────────────────────────────────────

function openCreateProduct() {
  selectedProduct.value = null
  showProductModal.value = true
}

function openEditProduct(product) {
  selectedProduct.value = product
  showProductModal.value = true
}

function closeProductModal() {
  showProductModal.value = false
  selectedProduct.value = null
}

async function saveProduct(productData) {
  if (selectedProduct.value) {
    const result = await updateProduct(selectedProduct.value.id, productData)
    if (result) showToast('Producto actualizado')
  } else {
    const result = await createProduct(productData)
    if (result) showToast('Producto creado')
  }
  closeProductModal()
}

async function adjustStock(product, delta) {
  savingStock.value[product.id] = true
  try {
    await updateStock(product.id, Math.abs(delta), delta > 0 ? 'add' : 'subtract')
  } finally {
    savingStock.value[product.id] = false
  }
}

async function handleToggleStatus(product) {
  await toggleProductStatus(product.id)
}

function confirmDelete(product) {
  productToDelete.value = product
}

async function handleDelete() {
  if (!productToDelete.value) return
  deleting.value = true
  const ok = await deleteProduct(productToDelete.value.id)
  deleting.value = false
  if (ok) showToast('Producto eliminado')
  productToDelete.value = null
}

// ─── Category actions ─────────────────────────────────────────────────────────

function closeCategoryModal() {
  showCategoryModal.value = false
}

async function handleAddCategory(category) {
  const result = await createCategory(category)
  if (result) showToast('Categoría creada')
}

async function handleUpdateCategory(id, data) {
  const result = await updateCategory(id, data)
  if (result) showToast('Categoría actualizada')
}

async function handleDeleteCategory(category) {
  const ok = await deleteCategory(category.id)
  if (ok) showToast('Categoría eliminada')
}

// ─── Export ──────────────────────────────────────────────────────────────────

function exportCSV() {
  const rows = filteredProducts.value.map(p => ({
    Nombre: p.name,
    Categoría: p.category?.name ?? '—',
    Marca: p.brand ?? '—',
    Precio: p.price.toFixed(2),
    Costo: p.cost.toFixed(2),
    Stock: p.stock,
    'Stock Mín': p.minStock,
    'Stock Máx': p.maxStock,
    Estado: statusLabel(p.status),
  }))
  if (!rows.length) return
  const csv = [
    Object.keys(rows[0]).join(','),
    ...rows.map(r => Object.values(r).map(v => `"${v}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inventario-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-8px); }
</style>
