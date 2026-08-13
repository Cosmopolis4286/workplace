import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'
import type { ProductStatus, Category, Product } from '../catalog/useMenu'

// ─── Types ───────────────────────────────────────────────────────────────────

export type StockUpdateType = 'set' | 'add' | 'subtract'

export interface CreateProductPayload {
  name: string
  description?: string
  price: number
  cost?: number
  stock: number
  minStock?: number
  maxStock?: number
  unit?: string
  image?: string
  preparationTime?: number
  calories?: number
  ingredients?: string[]
  allergens?: string[]
  categoryId: string
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  status?: ProductStatus
}

// ─── Module-level state (singleton across all composable instances) ──────────

const products = ref<Product[]>([])
const categories = ref<Category[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// ─── Composable ──────────────────────────────────────────────────────────────

export const useInventory = () => {
  const { get, post, put, patch, del } = useApi()

  // ─── Computed ───────────────────────────────────────────────────────────────

  const lowStockProducts = computed(() =>
    products.value.filter((p) => p.stock > 0 && p.stock <= p.minStock),
  )

  const outOfStockProducts = computed(() =>
    products.value.filter((p) => p.stock === 0),
  )

  const totalProducts = computed(() => products.value.length)

  const totalValue = computed(() =>
    products.value.reduce((sum, p) => sum + p.price * p.stock, 0),
  )

  // ─── Categories ─────────────────────────────────────────────────────────────

  async function fetchCategories(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      categories.value = await get<Category[]>('/menu/categories')
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al cargar categorías')
    } finally {
      loading.value = false
    }
  }

  async function addCategory(payload: { name: string; color?: string }): Promise<Category | null> {
    try {
      const created = await post<Category>('/menu/categories', payload)
      categories.value.push(created)
      return created
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al crear categoría')
      return null
    }
  }

  async function updateCategory(
    id: string,
    payload: { name?: string; color?: string },
  ): Promise<Category | null> {
    try {
      const updated = await put<Category>(`/menu/categories/${id}`, payload)
      const idx = categories.value.findIndex((c) => c.id === id)
      if (idx !== -1) categories.value[idx] = updated
      return updated
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al actualizar categoría')
      return null
    }
  }

  async function deleteCategory(id: string): Promise<boolean> {
    try {
      await del(`/menu/categories/${id}`)
      categories.value = categories.value.filter((c) => c.id !== id)
      return true
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al eliminar categoría')
      return false
    }
  }

  // ─── Products ────────────────────────────────────────────────────────────────

  async function fetchProducts(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      products.value = await get<Product[]>('/menu/products')
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al cargar productos')
    } finally {
      loading.value = false
    }
  }

  async function addProduct(payload: CreateProductPayload): Promise<Product | null> {
    try {
      const created = await post<Product>('/menu/products', payload)
      products.value.push(created)
      return created
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al crear producto')
      return null
    }
  }

  async function updateProduct(
    id: string,
    payload: UpdateProductPayload,
  ): Promise<Product | null> {
    try {
      const updated = await put<Product>(`/menu/products/${id}`, payload)
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = updated
      return updated
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al actualizar producto')
      return null
    }
  }

  async function deleteProduct(id: string): Promise<boolean> {
    try {
      await del(`/menu/products/${id}`)
      products.value = products.value.filter((p) => p.id !== id)
      return true
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al eliminar producto')
      return false
    }
  }

  async function updateStock(
    id: string,
    quantity: number,
    type: StockUpdateType = 'set',
  ): Promise<Product | null> {
    try {
      const updated = await patch<Product>(`/menu/products/${id}/stock`, { quantity, type })
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = updated
      return updated
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al actualizar stock')
      return null
    }
  }

  async function toggleProductStatus(id: string): Promise<Product | null> {
    try {
      const updated = await patch<Product>(`/menu/products/${id}/toggle-status`, {})
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = updated
      return updated
    } catch (err: unknown) {
      error.value = extractMessage(err, 'Error al cambiar estado del producto')
      return null
    }
  }

  async function init(): Promise<void> {
    await Promise.all([fetchCategories(), fetchProducts()])
  }

  return {
    // State
    products,
    categories,
    loading,
    error,
    // Computed
    lowStockProducts,
    outOfStockProducts,
    totalProducts,
    totalValue,
    // Category actions
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    // Product actions
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    toggleProductStatus,
    // Init
    init,
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractMessage(err: unknown, fallback: string): string {
  const msg = (err as any)?.message
  if (msg) return Array.isArray(msg) ? msg[0] : msg
  return fallback
}
