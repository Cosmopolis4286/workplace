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
        <HeaderActionButton
          v-if="storeSlug"
          :icon="ArrowTopRightOnSquareIcon"
          @click="openPublicCatalog"
        >
          Ver catálogo público
        </HeaderActionButton>
        <HeaderActionButton :icon="PlusIcon" @click="showCategoryModal = true">
          Nueva Categoría
        </HeaderActionButton>
        <HeaderActionButton :icon="CubeIcon" @click="showBundleModal = true">
          Nuevo Pack
        </HeaderActionButton>
        <HeaderActionButton variant="primary" :icon="PlusIcon" @click="openCreateProduct">
          Nuevo Producto
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Plan usage banner -->
    <PlanUsageBanner :usage="usage" :show="['products']" />

    <!-- Búsqueda y filtro por estado -->
    <div v-if="!loading && categoriesWithProducts.length > 0" class="card p-4 flex flex-wrap gap-3 items-center mb-4">
      <div class="relative flex-1 min-w-48">
        <MagnifyingGlassIcon class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          v-model="search"
          type="text"
          placeholder="Buscar producto o marca..."
          class="input-field pl-9 py-2 text-sm"
        />
      </div>
      <select v-model="filterStatus" class="input-field py-2 text-sm min-w-40">
        <option value="">Todos los estados</option>
        <option value="AVAILABLE">Disponible</option>
        <option value="LOW_STOCK">Bajo Stock</option>
        <option value="OUT_OF_STOCK">Agotado</option>
        <option value="UNAVAILABLE">No disponible</option>
      </select>
      <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <input v-model="selectMode" type="checkbox" class="rounded border-gray-300 text-workplace-red" />
        Selección múltiple
      </label>
    </div>

    <!-- Barra de acciones masivas -->
    <div
      v-if="selectMode && selectedIds.size > 0"
      class="sticky top-0 z-10 mb-4 card p-3 flex flex-wrap items-center gap-3 border-workplace-red/30 bg-red-50/60"
    >
      <span class="text-sm font-medium text-gray-700">{{ selectedIds.size }} seleccionado(s)</span>
      <div class="flex flex-wrap gap-2 ml-auto">
        <button class="btn-secondary text-sm px-3 py-1.5" :disabled="bulkBusy" @click="handleBulkActivate">
          Activar
        </button>
        <button class="btn-secondary text-sm px-3 py-1.5" :disabled="bulkBusy" @click="handleBulkDeactivate">
          Desactivar
        </button>
        <select
          class="input-field text-sm py-1.5 min-w-40"
          :disabled="bulkBusy"
          @change="handleBulkMoveCategory(($event.target as HTMLSelectElement).value)"
        >
          <option value="">Mover a categoría…</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
        <button class="btn-secondary text-sm px-3 py-1.5 text-red-600 hover:bg-red-100" :disabled="bulkBusy" @click="handleBulkDelete">
          Eliminar
        </button>
        <button class="text-sm text-gray-500 hover:text-gray-700 px-2" @click="clearSelection">
          Cancelar
        </button>
      </div>
    </div>

    <!-- Toolbar: ordenamiento y productos por página -->
    <div v-if="!loading && categoriesWithProducts.length > 0" class="flex flex-wrap items-center justify-end gap-3 mb-4">
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-600">Ordenar por</label>
        <select v-model="sortBy" class="px-3 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white">
          <option value="relevance">Relevancia</option>
          <option value="price_asc">Precio: menor a mayor</option>
          <option value="price_desc">Precio: mayor a menor</option>
          <option value="name">Nombre A–Z</option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-sm font-medium text-gray-600">Mostrar</label>
        <select v-model.number="pageSize" class="px-3 py-1.5 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-4 focus:ring-red-500 focus:border-red-500 transition-all duration-300 bg-white">
          <option :value="10">10 por categoría</option>
          <option :value="20">20 por categoría</option>
          <option :value="40">40 por categoría</option>
        </select>
      </div>
    </div>

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

    <!-- Reordenar categorías: arrastra el encabezado de una sección sobre otra para intercambiarlas.
         Solo disponible sin filtros activos (mismo criterio que el reorder de productos, ver abajo):
         con la lista filtrada, el array "completo" que se envía al backend ya no sería el real. -->
    <div v-if="!loading && canReorder && categoriesWithProducts.length > 1" class="mb-4 text-xs text-gray-400 flex items-center gap-1.5">
      <ArrowsUpDownIcon class="h-3.5 w-3.5" />
      Arrastra el encabezado de una categoría o una tarjeta de producto para reordenar
    </div>

    <!-- Menu Categories -->
    <div v-if="!loading" class="space-y-8">
      <DraggableWidget
        v-for="category in displayCategories"
        :key="category.id"
        :widget-id="category.id"
        :disabled="!canReorder"
        @drag-swap="handleCategoryDragSwap"
      >
        <div class="card p-6">
          <div class="flex justify-between items-center mb-6">
            <div class="flex items-center">
              <Bars3Icon v-if="canReorder" class="h-4 w-4 text-gray-300 mr-2 cursor-grab" />
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
            <DraggableWidget
              v-for="product in category.visibleProducts"
              :key="product.id"
              :widget-id="product.id"
              :disabled="!canReorder"
              @drag-swap="(from, to) => handleProductDragSwap(category.id, from, to)"
            >
              <MenuProductCard
                :product="product"
                :selectable="selectMode"
                :selected="selectedIds.has(product.id)"
                @edit="openEditProduct"
                @delete="confirmDeleteProduct"
                @toggle-status="handleToggleStatus"
                @toggle-select="toggleSelect"
              />
            </DraggableWidget>
          </div>

          <div v-if="category.products.length > category.visibleProducts.length" class="mt-4 text-center">
            <button @click="showMore(category.id)" class="btn-secondary">
              Mostrar más ({{ category.products.length - category.visibleProducts.length }} restantes)
            </button>
          </div>
        </div>
      </DraggableWidget>

      <!-- Empty state: sin productos en absoluto -->
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

      <!-- Empty state: hay productos, pero el filtro no encontró nada -->
      <div v-else-if="displayCategories.length === 0" class="text-center py-12">
        <MagnifyingGlassIcon class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">Sin resultados</h3>
        <p class="mt-1 text-sm text-gray-500">Ningún producto coincide con "{{ search }}"{{ filterStatus ? ' y el estado seleccionado' : '' }}.</p>
        <button class="mt-4 btn-secondary" @click="clearFilters">Limpiar filtros</button>
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

    <!-- Bundle Modal -->
    <BundleModal
      :is-open="showBundleModal"
      :categories="categories"
      :products="products"
      :saving="savingBundle"
      @close="showBundleModal = false"
      @save="handleSaveBundle"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// El middleware global auth.ts (bloque 4c) ya restringe /menu a usuarios con
// categoría "Comida" y permiso menu:view — menu-category.ts cubría el mismo
// caso de forma menos completa (sin chequear el permiso) y se eliminó para
// no mantener dos guards independientes con la misma responsabilidad.
definePageMeta({
  middleware: ['auth']
})
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CubeIcon,
  DocumentTextIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowTopRightOnSquareIcon,
  ArrowsUpDownIcon,
  Bars3Icon,
} from '@heroicons/vue/24/outline'
import { useMenu } from '~/composables/catalog/useMenu'
import type { Category, Product, CreateBundlePayload } from '~/composables/catalog/useMenu'
import { usePlans } from '~/composables/commerce/usePlans'
import { useUserPreferences } from '~/composables/users/useUserPreferences'
import { useSettings } from '~/composables/commerce/useSettings'
import MenuProductCard from '~/components/catalog/MenuProductCard.vue'
import DraggableWidget from '~/components/dashboard/DraggableWidget.vue'
import ProductModal from '~/components/modals/ProductModal.vue'
import BundleModal from '~/components/modals/BundleModal.vue'
import CategoryModal from '~/components/modals/CategoryModal.vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import PlanUsageBanner from '~/components/plans/PlanUsageBanner.vue'
import { useToast } from '~/composables/ui/useToast'
import { useConfirm } from '~/composables/ui/useConfirm'

const toast = useToast()
const { confirm } = useConfirm()
const {
  categories,
  products,
  loading,
  error,
  categoriesWithProducts,
  totalProducts,
  availableProducts,
  stats,
  init,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  createBundle,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  bulkActivate,
  bulkDeactivate,
  bulkDeleteProducts,
  bulkMoveCategory,
  reorderCategories,
  reorderProducts,
} = useMenu()

const { commerce: settingsCommerce, loadSettings } = useSettings()
const storeSlug = computed(() => settingsCommerce.value?.slug ?? null)

function openPublicCatalog() {
  if (!storeSlug.value) return
  window.open(`/loja/${storeSlug.value}`, '_blank', 'noopener')
}

// ─── Modals state ────────────────────────────────────────────────────────────

const showProductModal = ref(false)
const showBundleModal = ref(false)
const showCategoryModal = ref(false)
const selectedProduct = ref<Product | null>(null)
const selectedCategory = ref<Category | null>(null)
const savingCategory = ref(false)
const savingBundle = ref(false)

// ─── Ordenamiento y paginación ───────────────────────────────────────────────

const { prefs: userPrefs, savePreferences } = useUserPreferences()

const sortBy = ref(userPrefs.value.defaultSort)
const pageSize = ref(userPrefs.value.pageSize)

watch(sortBy, (val: string) => savePreferences({ defaultSort: val }))
watch(pageSize, (val: number) => {
  savePreferences({ pageSize: val })
  categoryShowCount.value = {}
})

// Cuántos productos mostrar por categoría (se incrementa con "Mostrar más")
const categoryShowCount = ref<Record<string, number>>({})

function sortProducts(items: Product[]): Product[] {
  const sorted = [...items]
  switch (sortBy.value) {
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price)
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price)
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return sorted
  }
}

// ─── Búsqueda y filtro (client-side: el catálogo completo ya está cargado
// con limit:1000, ver init() en onMounted — un round-trip al backend por
// cada tecleo no aporta nada aquí, a diferencia de /inventory que sí pagina
// server-side de verdad) ──────────────────────────────────────────────────

const search = ref('')
const filterStatus = ref('')

function clearFilters() {
  search.value = ''
  filterStatus.value = ''
}

function matchesFilters(product: Product): boolean {
  if (filterStatus.value && product.status !== filterStatus.value) return false
  if (search.value.trim()) {
    const q = search.value.trim().toLowerCase()
    const inName = product.name.toLowerCase().includes(q)
    const inBrand = product.brand?.toLowerCase().includes(q) ?? false
    if (!inName && !inBrand) return false
  }
  return true
}

const displayCategories = computed(() =>
  categoriesWithProducts.value
    .map((category) => {
      const filtered = category.products.filter(matchesFilters)
      const sortedProducts = sortProducts(filtered)
      const showCount = categoryShowCount.value[category.id] ?? pageSize.value
      return {
        ...category,
        products: sortedProducts,
        visibleProducts: sortedProducts.slice(0, showCount),
      }
    })
    .filter((category) => category.products.length > 0),
)

function showMore(categoryId: string) {
  const current = categoryShowCount.value[categoryId] ?? pageSize.value
  categoryShowCount.value = { ...categoryShowCount.value, [categoryId]: current + pageSize.value }
}

// ─── Reordenar (drag-and-drop) ───────────────────────────────────────────────
// El array que se envía al backend debe ser el orden COMPLETO real de la
// categoría/comercio — con un filtro de búsqueda/estado activo, o un
// "Ordenar por" distinto de "Relevancia" (que es justo el que refleja
// sortOrder), lo que se ve en pantalla ya no es ese array completo, así que
// el reorder se deshabilita en esos casos para no corromper el orden real.
const canReorder = computed(() =>
  sortBy.value === 'relevance' && !search.value.trim() && !filterStatus.value && !selectMode.value,
)

function handleCategoryDragSwap(fromId: string, toId: string) {
  if (!canReorder.value) return
  const ids = categories.value.map((c) => c.id)
  const fromIdx = ids.indexOf(fromId)
  const toIdx = ids.indexOf(toId)
  if (fromIdx === -1 || toIdx === -1) return
  ;[ids[fromIdx], ids[toIdx]] = [ids[toIdx], ids[fromIdx]]
  reorderCategories(ids)
}

function handleProductDragSwap(categoryId: string, fromId: string, toId: string) {
  if (!canReorder.value) return
  // Orden completo y actual de ESA categoría (no el array filtrado de
  // displayCategories) — products ya viene ordenado por sortOrder desde el
  // backend (ver MenuService.getProducts).
  const ids = products.value.filter((p) => p.categoryId === categoryId).map((p) => p.id)
  const fromIdx = ids.indexOf(fromId)
  const toIdx = ids.indexOf(toId)
  if (fromIdx === -1 || toIdx === -1) return
  ;[ids[fromIdx], ids[toIdx]] = [ids[toIdx], ids[fromIdx]]
  reorderProducts(ids)
}

// ─── Selección múltiple y acciones masivas ──────────────────────────────────

const selectMode = ref(false)
const selectedIds = ref<Set<string>>(new Set())
const bulkBusy = ref(false)

watch(selectMode, (enabled) => { if (!enabled) selectedIds.value = new Set() })

function toggleSelect(productId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(productId)) next.delete(productId)
  else next.add(productId)
  selectedIds.value = next
}

function clearSelection() {
  selectedIds.value = new Set()
}

async function handleBulkActivate() {
  bulkBusy.value = true
  const count = await bulkActivate([...selectedIds.value])
  bulkBusy.value = false
  if (count > 0) { toast.success(`${count} producto(s) activado(s)`); clearSelection() }
}

async function handleBulkDeactivate() {
  bulkBusy.value = true
  const count = await bulkDeactivate([...selectedIds.value])
  bulkBusy.value = false
  if (count > 0) { toast.success(`${count} producto(s) desactivado(s)`); clearSelection() }
}

async function handleBulkMoveCategory(categoryId: string) {
  if (!categoryId) return
  bulkBusy.value = true
  const count = await bulkMoveCategory([...selectedIds.value], categoryId)
  bulkBusy.value = false
  if (count > 0) { toast.success(`${count} producto(s) movido(s) de categoría`); clearSelection() }
}

async function handleBulkDelete() {
  const n = selectedIds.value.size
  const ok = await confirm({
    title: 'Eliminar productos',
    message: `¿Eliminar ${n} producto(s) seleccionado(s)? Esta acción no se puede deshacer.`,
    confirmText: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return
  bulkBusy.value = true
  const count = await bulkDeleteProducts([...selectedIds.value])
  bulkBusy.value = false
  if (count > 0) { toast.success(`${count} producto(s) eliminado(s)`); clearSelection() }
}

// ─── Header stats ────────────────────────────────────────────────────────────

const headerStats = computed(() => [
  { label: 'Total Productos', value: totalProducts.value.toString(), change: '', changeType: 'neutral' },
  { label: 'Categorías', value: categories.value.length.toString(), change: 'Activas', changeType: 'neutral' },
  { label: 'Disponibles', value: availableProducts.value.toString(), change: '', changeType: 'increase' },
  {
    label: 'Bajo Stock',
    value: stats.value.lowStock.toString(),
    change: stats.value.lowStock > 0 ? 'Revisar' : 'OK',
    changeType: stats.value.lowStock > 0 ? 'decrease' : 'increase',
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
    toast.warning('No se puede eliminar', `La categoría "${category.name}" tiene ${productCount} producto(s). Muévalos o elimínelos primero.`)
    return
  }
  const ok = await confirm({ title: 'Eliminar categoría', message: `¿Eliminar la categoría "${category.name}"?`, confirmText: 'Eliminar', variant: 'danger' })
  if (ok) {
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

const handleSaveBundle = async (payload: CreateBundlePayload) => {
  savingBundle.value = true
  const created = await createBundle(payload)
  savingBundle.value = false
  if (created) {
    showBundleModal.value = false
    toast.success('Pack creado', `"${created.name}" ya está disponible en tu catálogo`)
  }
}

const confirmDeleteProduct = async (productId: string) => {
  const ok = await confirm({ title: 'Eliminar producto', message: '¿Estás seguro de que quieres eliminar este producto?', confirmText: 'Eliminar', variant: 'danger' })
  if (ok) {
    await deleteProduct(productId)
  }
}

const handleToggleStatus = async (productId: string) => {
  await toggleProductStatus(productId)
}

// ─── Init ─────────────────────────────────────────────────────────────────────

const { usage, fetchUsage } = usePlans()

const route = useRoute()
const router = useRouter()

onMounted(async () => {
  // limit alto: esta página agrupa y pagina por categoría client-side (ver
  // displayCategories/showMore más arriba), necesita el catálogo completo —
  // a diferencia de /inventory, que sí pagina server-side de verdad.
  // loadSettings() trae commerce.slug para el botón "Ver catálogo público".
  await Promise.all([init({ limit: 1000 }), fetchUsage(), loadSettings()])

  const editId = typeof route.query.edit === 'string' ? route.query.edit : null
  if (editId) {
    const target = products.value.find(p => p.id === editId)
    if (target) openEditProduct(target)
    router.replace({ query: { ...route.query, edit: undefined } })
  }
})
</script>
