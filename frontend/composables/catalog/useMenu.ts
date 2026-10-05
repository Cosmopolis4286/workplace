import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'

export type ProductStatus = 'AVAILABLE' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'UNAVAILABLE'

export interface Category {
  id: string
  name: string
  color: string
  commerceId: string
  _count?: { products: number }
}

export interface Product {
  id: string
  name: string
  description?: string
  price: number
  cost: number
  stock: number
  minStock: number
  maxStock: number
  unit: string
  status: ProductStatus
  image?: string
  brand?: string
  forSale: boolean
  bnplEligible: boolean
  preparationTime?: number
  calories?: number
  ingredients: string[]
  allergens: string[]
  tags: string[]
  categoryId: string
  category: { id: string; name: string; color: string }
  commerceId: string
  isBundle?: boolean
  bundleItems?: { quantity: number; componentProduct: { id: string; name: string; price: number; image: string | null } }[]
}

export interface ProductSelectorItem {
  id: string
  name: string
  price: number
  stock: number
  image?: string
  unit: string
  status: ProductStatus
}

export interface ProductsStats {
  total: number
  lowStock: number
  outOfStock: number
  totalValue: number
  totalCost: number
}

export interface ProductFilters {
  search?: string
  categoryId?: string
  status?: ProductStatus
  page?: number
  limit?: number
}

export interface CreateBundlePayload {
  name: string
  description?: string
  price: number
  image?: string
  categoryId: string
  items: { productId: string; quantity: number }[]
}

// Estado por instancia (NO singleton): dos llamadas a useMenu() en
// componentes distintos —ej. inventory.vue y el StockReportModal.vue que
// abre encima— deben poder cargar/filtrar productos de forma independiente
// sin pisarse el array `products` entre sí.
export const useMenu = () => {
  const { get, post, put, patch, del } = useApi()
  const router = useRouter()

  const categories = ref<Category[]>([])
  const products = ref<Product[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const totalCount = ref(0)
  const currentPage = ref(1)
  const totalPages = ref(1)
  const stats = ref<ProductsStats>({ total: 0, lowStock: 0, outOfStock: 0, totalValue: 0, totalCost: 0 })
  const loadingStats = ref(false)

  // Cancela la carga de productos en vuelo cuando llega una nueva (ej. un
  // filtro con debounce disparado antes de que la respuesta anterior
  // llegue), mismo patrón que useExpenses.ts.
  let loadProductsController: AbortController | null = null

  // ─── Computed ──────────────────────────────────────────────────────────────

  const categoriesWithProducts = computed(() =>
    categories.value.map((cat) => ({
      ...cat,
      products: products.value.filter((p) => p.categoryId === cat.id),
    })),
  )

  const totalProducts = computed(() => stats.value.total)
  const lowStockCount = computed(() => stats.value.lowStock)
  const outOfStockCount = computed(() => stats.value.outOfStock)
  const totalValue = computed(() => stats.value.totalValue)
  // Sobre el array actualmente cargado (no server-side) — válido cuando el
  // consumidor carga el catálogo completo (ej. menu.vue), no cuando trabaja
  // con una página parcial (ej. inventory.vue, que usa stats.* en su lugar).
  const availableProducts = computed(() => products.value.filter((p) => p.status === 'AVAILABLE').length)

  // ─── Load categories (con conteo por categoría) ────────────────────────────

  async function loadCategories() {
    try {
      categories.value = await get<Category[]>('/menu/categories')
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar las categorías'
      if (err?.status === 401) router.push('/login')
    }
  }

  async function loadStats() {
    loadingStats.value = true
    try {
      stats.value = await get<ProductsStats>('/menu/products/stats')
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar las estadísticas de inventario'
    } finally {
      loadingStats.value = false
    }
  }

  // ─── Load products (paginado, server-side) ─────────────────────────────────

  async function loadProducts(filters: ProductFilters = {}) {
    loadProductsController?.abort()
    const controller = new AbortController()
    loadProductsController = controller

    loading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
      })
      const qs = params.toString()
      const res = await get<{ data: Product[]; total: number; page: number; totalPages: number }>(
        `/menu/products${qs ? '?' + qs : ''}`,
        { signal: controller.signal },
      )
      if (controller.signal.aborted) return
      products.value = res.data
      totalCount.value = res.total
      currentPage.value = res.page
      totalPages.value = res.totalPages
    } catch (err: any) {
      if (controller.signal.aborted) return
      error.value = err?.message ?? 'Error al cargar los productos'
      if (err?.status === 401) router.push('/login')
    } finally {
      if (!controller.signal.aborted) loading.value = false
    }
  }

  // Carga inicial: primera página de productos + categorías + stats,
  // en paralelo — reemplaza al viejo loadMenu() que traía TODO el catálogo.
  async function init(filters: ProductFilters = {}) {
    await Promise.all([loadProducts(filters), loadCategories(), loadStats()])
  }

  // Catálogo completo (sin paginar) para selectores de producto — ej. elegir
  // qué vender al crear una Order. No usa el estado paginado de arriba.
  async function fetchProductsForSelector(search?: string): Promise<ProductSelectorItem[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : ''
    return get<ProductSelectorItem[]>(`/menu/products/selector${qs}`)
  }

  // Catálogo completo con todos los campos, para exportación CSV — siempre
  // trae TODOS los productos sin importar la página/filtro visible.
  async function fetchProductsForExport(): Promise<Product[]> {
    return get<Product[]>('/menu/products/export')
  }

  // ─── Categories ────────────────────────────────────────────────────────────

  async function createCategory(data: { name: string; color?: string }): Promise<Category | null> {
    try {
      const category = await post<Category>('/menu/categories', data)
      categories.value.push(category)
      return category
    } catch (err: any) {
      error.value = err?.message ?? 'Error al crear la categoría'
      return null
    }
  }

  async function updateCategory(id: string, data: { name?: string; color?: string }): Promise<Category | null> {
    try {
      const category = await put<Category>(`/menu/categories/${id}`, data)
      const idx = categories.value.findIndex((c) => c.id === id)
      if (idx !== -1) categories.value[idx] = category
      return category
    } catch (err: any) {
      error.value = err?.message ?? 'Error al actualizar la categoría'
      return null
    }
  }

  async function deleteCategory(id: string): Promise<boolean> {
    try {
      await del(`/menu/categories/${id}`)
      categories.value = categories.value.filter((c) => c.id !== id)
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar la categoría'
      return false
    }
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  async function createProduct(data: Partial<Product>): Promise<Product | null> {
    try {
      const product = await post<Product>('/menu/products', data)
      await Promise.all([loadProducts(), loadStats()])
      return product
    } catch (err: any) {
      error.value = err?.message ?? 'Error al crear el producto'
      return null
    }
  }

  async function createBundle(data: CreateBundlePayload): Promise<Product | null> {
    try {
      const bundle = await post<Product>('/menu/bundles', data)
      await Promise.all([loadProducts(), loadStats()])
      return bundle
    } catch (err: any) {
      error.value = err?.message ?? 'Error al crear el pack'
      return null
    }
  }

  async function updateProduct(id: string, data: Partial<Product>): Promise<Product | null> {
    try {
      const product = await put<Product>(`/menu/products/${id}`, data)
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = product
      await loadStats()
      return product
    } catch (err: any) {
      error.value = err?.message ?? 'Error al actualizar el producto'
      return null
    }
  }

  async function deleteProduct(id: string): Promise<boolean> {
    try {
      await del(`/menu/products/${id}`)
      products.value = products.value.filter((p) => p.id !== id)
      totalCount.value = Math.max(0, totalCount.value - 1)
      await loadStats()
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar el producto'
      return false
    }
  }

  // ─── Bulk actions ──────────────────────────────────────────────────────────
  // Todas recargan products/stats tras la mutación en vez de actualizar el
  // array localmente (como las acciones individuales de arriba) — el backend
  // es la fuente de verdad de cuántos items realmente matchearon (un id ya
  // borrado por otra pestaña simplemente no cuenta), y re-sincronizar evita
  // que el estado local divergiera del real.

  async function bulkActivate(ids: string[]): Promise<number> {
    try {
      const res = await post<{ updated: number }>('/menu/products/bulk-activate', { productIds: ids })
      await Promise.all([loadProducts(), loadStats()])
      return res.updated
    } catch (err: any) {
      error.value = err?.message ?? 'Error al activar los productos'
      return 0
    }
  }

  async function bulkDeactivate(ids: string[]): Promise<number> {
    try {
      const res = await post<{ updated: number }>('/menu/products/bulk-deactivate', { productIds: ids })
      await Promise.all([loadProducts(), loadStats()])
      return res.updated
    } catch (err: any) {
      error.value = err?.message ?? 'Error al desactivar los productos'
      return 0
    }
  }

  async function bulkDeleteProducts(ids: string[]): Promise<number> {
    try {
      const res = await post<{ deleted: number }>('/menu/products/bulk-delete', { productIds: ids })
      await Promise.all([loadProducts(), loadStats()])
      return res.deleted
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar los productos'
      return 0
    }
  }

  async function bulkMoveCategory(ids: string[], categoryId: string): Promise<number> {
    try {
      const res = await post<{ updated: number }>('/menu/products/bulk-move-category', { productIds: ids, categoryId })
      await Promise.all([loadProducts(), loadStats()])
      return res.updated
    } catch (err: any) {
      error.value = err?.message ?? 'Error al mover los productos de categoría'
      return 0
    }
  }

  async function updateStock(id: string, quantity: number, type: 'set' | 'add' | 'subtract' = 'set'): Promise<Product | null> {
    try {
      const product = await patch<Product>(`/menu/products/${id}/stock`, { quantity, type })
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = product
      await loadStats()
      return product
    } catch (err: any) {
      error.value = err?.message ?? 'Error al actualizar el stock'
      return null
    }
  }

  async function toggleProductStatus(id: string): Promise<Product | null> {
    try {
      const product = await patch<Product>(`/menu/products/${id}/toggle-status`, {})
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = product
      return product
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cambiar el estado'
      return null
    }
  }

  async function uploadProductImage(id: string, file: File): Promise<Product | null> {
    try {
      const formData = new FormData()
      formData.append('image', file)
      const product = await post<Product>(`/menu/products/${id}/image`, formData)
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = product
      return product
    } catch (err: any) {
      error.value = err?.message ?? 'Error al subir la imagen'
      return null
    }
  }

  return {
    // state
    categories,
    products,
    loading,
    error,
    totalCount,
    currentPage,
    totalPages,
    stats,
    loadingStats,
    // computed
    categoriesWithProducts,
    totalProducts,
    lowStockCount,
    outOfStockCount,
    totalValue,
    availableProducts,
    // actions
    init,
    loadProducts,
    loadCategories,
    loadStats,
    fetchProductsForSelector,
    fetchProductsForExport,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    createBundle,
    updateProduct,
    deleteProduct,
    updateStock,
    toggleProductStatus,
    uploadProductImage,
    bulkActivate,
    bulkDeactivate,
    bulkDeleteProducts,
    bulkMoveCategory,
  }
}
