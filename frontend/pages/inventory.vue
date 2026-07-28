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

        <!-- Filters bar -->
        <div class="card p-4 flex flex-wrap gap-3 items-center">
          <div class="relative flex-1 min-w-48">
            <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Buscar producto..."
              class="input-field pl-9 py-2 text-sm"
            />
          </div>

          <select v-model="filterCategory" class="input-field py-2 text-sm min-w-40">
            <option value="">Todas las categorías</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>

          <select v-model="filterStatus" class="input-field py-2 text-sm min-w-36">
            <option value="">Todos los estados</option>
            <option value="AVAILABLE">Disponible</option>
            <option value="LOW_STOCK">Bajo Stock</option>
            <option value="OUT_OF_STOCK">Agotado</option>
            <option value="UNAVAILABLE">No disponible</option>
          </select>

          <div class="flex rounded-lg border overflow-hidden">
            <button
              @click="viewMode = 'grid'"
              :class="viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'"
              class="px-3 py-2 transition-colors"
              title="Vista cuadrícula"
            >
              <Squares2X2Icon class="h-4 w-4" />
            </button>
            <button
              @click="viewMode = 'table'"
              :class="viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'"
              class="px-3 py-2 border-l transition-colors"
              title="Vista tabla"
            >
              <TableCellsIcon class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="card p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-medium text-gray-900">
              Productos
              <span class="ml-2 text-sm text-gray-400 font-normal">({{ filteredProducts.length }})</span>
            </h3>
          </div>

          <!-- Loading skeleton -->
          <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div v-for="n in 6" :key="n" class="border rounded-lg p-4 animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div class="h-3 bg-gray-200 rounded w-1/2 mb-4" />
              <div class="flex justify-between">
                <div class="h-5 bg-gray-200 rounded w-1/4" />
                <div class="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          </div>

          <!-- Empty state -->
          <div v-else-if="filteredProducts.length === 0" class="text-center py-12 text-gray-400">
            <CubeIcon class="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p class="text-sm">
              {{ products.length === 0 ? 'No hay productos. Agrega el primero.' : 'No hay productos que coincidan con los filtros.' }}
            </p>
            <button v-if="products.length === 0" @click="openCreateProduct" class="mt-4 btn-primary text-sm">
              Agregar Producto
            </button>
          </div>

          <!-- ── Grid view ────────────────────────────────────────────── -->
          <div v-else-if="viewMode === 'grid'" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div
              v-for="product in filteredProducts"
              :key="product.id"
              class="border rounded-xl p-4 hover:shadow-md transition-all group relative"
              :class="product.stock === 0 ? 'border-red-200 bg-red-50/30' : product.stock <= product.minStock ? 'border-yellow-200 bg-yellow-50/20' : 'border-gray-200'"
            >
              <!-- Status badge -->
              <div class="flex items-center justify-between mb-2">
                <h4 class="font-medium text-gray-900 truncate mr-2 text-sm">{{ product.name }}</h4>
                <span :class="statusBadgeClass(product.status)" class="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                  {{ statusLabel(product.status) }}
                </span>
              </div>

              <!-- Category + brand -->
              <div class="flex items-center gap-2 mb-3">
                <span
                  v-if="product.category"
                  class="inline-flex items-center gap-1 text-xs text-gray-500"
                >
                  <span class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: product.category.color }" />
                  {{ product.category.name }}
                </span>
                <span v-if="product.brand" class="text-xs text-gray-400">· {{ product.brand }}</span>
              </div>

              <!-- Price / Cost / Stock -->
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-lg font-bold text-gray-900">${{ product.price.toFixed(2) }}</p>
                  <p v-if="product.cost" class="text-xs text-gray-400">Costo: ${{ product.cost.toFixed(2) }}</p>
                </div>
                <div class="text-right">
                  <!-- Inline stock adjust -->
                  <div class="flex items-center gap-1">
                    <button
                      @click.stop="adjustStock(product, -1)"
                      :disabled="product.stock === 0 || savingStock[product.id]"
                      class="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-bold transition-colors"
                    >−</button>
                    <span
                      :class="product.stock === 0 ? 'text-red-600' : product.stock <= product.minStock ? 'text-yellow-600' : 'text-gray-700'"
                      class="text-sm font-semibold w-8 text-center"
                    >{{ product.stock }}</span>
                    <button
                      @click.stop="adjustStock(product, 1)"
                      :disabled="savingStock[product.id]"
                      class="w-6 h-6 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-sm font-bold transition-colors"
                    >+</button>
                  </div>
                  <p class="text-xs text-gray-400 mt-0.5">stock (mín {{ product.minStock }})</p>
                </div>
              </div>

              <!-- Actions overlay -->
              <div class="absolute top-3 right-3 hidden group-hover:flex items-center gap-1 bg-white rounded-lg shadow-sm border px-1.5 py-1">
                <button
                  @click.stop="openEditProduct(product)"
                  class="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                  title="Editar"
                >
                  <PencilIcon class="h-3.5 w-3.5" />
                </button>
                <button
                  @click.stop="handleToggleStatus(product)"
                  class="p-1 text-gray-500 hover:text-indigo-600 transition-colors"
                  :title="product.status === 'AVAILABLE' ? 'Deshabilitar' : 'Habilitar'"
                >
                  <component :is="product.status === 'AVAILABLE' ? EyeSlashIcon : EyeIcon" class="h-3.5 w-3.5" />
                </button>
                <button
                  @click.stop="confirmDelete(product)"
                  class="p-1 text-gray-500 hover:text-red-600 transition-colors"
                  title="Eliminar"
                >
                  <TrashIcon class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <!-- ── Table view ───────────────────────────────────────────── -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 border-b">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-700">Producto</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-700">Categoría</th>
                  <th class="px-4 py-3 text-right font-medium text-gray-700">Precio</th>
                  <th class="px-4 py-3 text-right font-medium text-gray-700">Costo</th>
                  <th class="px-4 py-3 text-center font-medium text-gray-700">Stock</th>
                  <th class="px-4 py-3 text-center font-medium text-gray-700">Estado</th>
                  <th class="px-4 py-3 text-center font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y">
                <tr v-for="product in filteredProducts" :key="product.id" class="hover:bg-gray-50 transition-colors">
                  <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">{{ product.name }}</div>
                    <div v-if="product.brand" class="text-xs text-gray-400">{{ product.brand }}</div>
                  </td>
                  <td class="px-4 py-3">
                    <div v-if="product.category" class="flex items-center gap-1.5">
                      <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: product.category.color }" />
                      <span class="text-gray-600">{{ product.category.name }}</span>
                    </div>
                    <span v-else class="text-gray-400">—</span>
                  </td>
                  <td class="px-4 py-3 text-right text-gray-900 font-medium">${{ product.price.toFixed(2) }}</td>
                  <td class="px-4 py-3 text-right text-gray-500">${{ product.cost.toFixed(2) }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center gap-1.5">
                      <button
                        @click="adjustStock(product, -1)"
                        :disabled="product.stock === 0 || savingStock[product.id]"
                        class="w-5 h-5 flex items-center justify-center rounded border text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-xs font-bold"
                      >−</button>
                      <span
                        :class="product.stock === 0 ? 'text-red-600' : product.stock <= product.minStock ? 'text-yellow-600' : 'text-gray-900'"
                        class="w-8 text-center font-semibold"
                      >{{ product.stock }}</span>
                      <button
                        @click="adjustStock(product, 1)"
                        :disabled="savingStock[product.id]"
                        class="w-5 h-5 flex items-center justify-center rounded border text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-xs font-bold"
                      >+</button>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-center">
                    <span :class="statusBadgeClass(product.status)" class="text-xs font-medium px-2 py-0.5 rounded-full">
                      {{ statusLabel(product.status) }}
                    </span>
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center gap-2">
                      <button @click="openEditProduct(product)" class="text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                        <PencilIcon class="h-4 w-4" />
                      </button>
                      <button @click="handleToggleStatus(product)" class="text-gray-400 hover:text-indigo-600 transition-colors" :title="product.status === 'AVAILABLE' ? 'Deshabilitar' : 'Habilitar'">
                        <component :is="product.status === 'AVAILABLE' ? EyeSlashIcon : EyeIcon" class="h-4 w-4" />
                      </button>
                      <button @click="confirmDelete(product)" class="text-gray-400 hover:text-red-600 transition-colors" title="Eliminar">
                        <TrashIcon class="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <!-- Quick actions -->
        <div class="card p-5">
          <h3 class="text-sm font-medium text-gray-900 mb-3">Acciones Rápidas</h3>
          <div class="space-y-2">
            <button @click="openCreateProduct" class="w-full btn-primary text-sm py-2">
              Agregar Producto
            </button>
            <button @click="showCategoryModal = true" class="w-full btn-secondary text-sm py-2">
              Gestionar Categorías
            </button>
            <button @click="showStockReportModal = true" class="w-full btn-secondary text-sm py-2">
              Reporte de Stock
            </button>
          </div>
        </div>

        <!-- Alerts -->
        <div v-if="outOfStockProducts.length > 0 || lowStockProducts.length > 0" class="card p-5">
          <h3 class="text-sm font-medium text-gray-900 mb-3">Alertas</h3>
          <div class="space-y-2">
            <button
              v-if="outOfStockProducts.length > 0"
              @click="filterStatus = 'OUT_OF_STOCK'"
              class="w-full flex items-center justify-between p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 hover:bg-red-100 transition-colors"
            >
              <span>{{ outOfStockProducts.length }} producto(s) agotado(s)</span>
              <ChevronRightIcon class="h-3.5 w-3.5" />
            </button>
            <button
              v-if="lowStockProducts.length > 0"
              @click="filterStatus = 'LOW_STOCK'"
              class="w-full flex items-center justify-between p-2.5 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700 hover:bg-yellow-100 transition-colors"
            >
              <span>{{ lowStockProducts.length }} producto(s) con bajo stock</span>
              <ChevronRightIcon class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Category breakdown -->
        <div v-if="categories.length > 0 && !loading" class="card p-5">
          <h3 class="text-sm font-medium text-gray-900 mb-3">Por Categoría</h3>
          <div class="space-y-2">
            <button
              v-for="cat in categoryBreakdown"
              :key="cat.id"
              @click="filterCategory = filterCategory === cat.id ? '' : cat.id"
              class="w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors"
              :class="filterCategory === cat.id ? 'bg-gray-100 font-medium' : 'hover:bg-gray-50'"
            >
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" :style="{ backgroundColor: cat.color }" />
                <span class="text-gray-700 truncate">{{ cat.name }}</span>
              </div>
              <span class="text-gray-400 ml-1 flex-shrink-0">{{ cat.count }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirm dialog -->
    <TransitionRoot appear :show="!!productToDelete" as="template">
      <Dialog as="div" @close="productToDelete = null" class="relative z-50">
        <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-150 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-black bg-opacity-30" />
        </TransitionChild>
        <div class="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild as="template" enter="duration-200 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-150 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
            <DialogPanel class="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
              <DialogTitle class="text-base font-semibold text-gray-900 mb-2">Eliminar producto</DialogTitle>
              <p class="text-sm text-gray-500 mb-6">
                ¿Eliminar <strong class="text-gray-700">{{ productToDelete?.name }}</strong>? Esta acción no se puede deshacer.
              </p>
              <div class="flex gap-3 justify-end">
                <button @click="productToDelete = null" class="btn-secondary text-sm py-2">Cancelar</button>
                <button @click="handleDelete" :disabled="deleting" class="btn-primary text-sm py-2 bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700">
                  {{ deleting ? 'Eliminando…' : 'Eliminar' }}
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </TransitionRoot>

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
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  Squares2X2Icon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from '@heroicons/vue/24/outline'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
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
  updateStock,
  toggleProductStatus,
  init,
} = useInventory()

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
    const result = await addProduct(productData)
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
  const result = await addCategory(category)
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
