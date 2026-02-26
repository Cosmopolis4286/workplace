import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

export type ProductStatus = 'DISPONIBLE' | 'AGOTADO' | 'BAJO_STOCK' | 'NO_DISPONIBLE'

export interface Category {
  id: string
  name: string
  color: string
  restaurantId: string
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
  preparationTime?: number
  calories?: number
  ingredients: string[]
  allergens: string[]
  categoryId: string
  category: { id: string; name: string; color: string }
  restaurantId: string
}

// Estado global compartido
const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export const useMenu = () => {
  const { getHeaders, refreshAccessToken, clearSession: _clearSession } = useAuth()
  const config = useRuntimeConfig()
  const apiUrl = config.public.apiUrl as string
  const router = useRouter()

  // ─── Computed ──────────────────────────────────────────────────────────────

  const categoriesWithProducts = computed(() =>
    categories.value.map((cat) => ({
      ...cat,
      products: products.value.filter((p) => p.categoryId === cat.id),
    })),
  )

  const totalProducts = computed(() => products.value.length)
  const availableProducts = computed(() => products.value.filter((p) => p.status === 'DISPONIBLE').length)
  const lowStockProducts = computed(() => products.value.filter((p) => p.status === 'BAJO_STOCK'))

  // ─── API helper ────────────────────────────────────────────────────────────

  async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = { 'Content-Type': 'application/json', ...getHeaders(), ...(options.headers as Record<string, string> || {}) }
    const res = await $fetch<T>(`${apiUrl}/api/menu${path}`, { ...options, headers } as Parameters<typeof $fetch>[1])
    return res
  }

  async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (err: unknown) {
      const status = (err as { status?: number; statusCode?: number })?.status
        ?? (err as { status?: number; statusCode?: number })?.statusCode
      if (status === 401) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          router.push('/login')
          throw err
        }
        return await fn()
      }
      throw err
    }
  }

  // ─── Load all ──────────────────────────────────────────────────────────────

  async function loadMenu() {
    loading.value = true
    error.value = null
    try {
      const [cats, prods] = await withAuthRetry(() =>
        Promise.all([
          apiFetch<Category[]>('/categories'),
          apiFetch<Product[]>('/products'),
        ]),
      )
      categories.value = cats
      products.value = prods
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cargar el menú'
    } finally {
      loading.value = false
    }
  }

  // ─── Categories ────────────────────────────────────────────────────────────

  async function createCategory(data: { name: string; color?: string }): Promise<Category | null> {
    try {
      const category = await withAuthRetry(() =>
        apiFetch<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
      )
      categories.value.push(category)
      return category
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al crear la categoría'
      return null
    }
  }

  async function updateCategory(id: string, data: { name?: string; color?: string }): Promise<Category | null> {
    try {
      const category = await withAuthRetry(() =>
        apiFetch<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      )
      const idx = categories.value.findIndex((c) => c.id === id)
      if (idx !== -1) categories.value[idx] = category
      return category
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al actualizar la categoría'
      return null
    }
  }

  async function deleteCategory(id: string): Promise<boolean> {
    try {
      await withAuthRetry(() => apiFetch(`/categories/${id}`, { method: 'DELETE' }))
      categories.value = categories.value.filter((c) => c.id !== id)
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al eliminar la categoría'
      return false
    }
  }

  // ─── Products ──────────────────────────────────────────────────────────────

  async function createProduct(data: Partial<Product>): Promise<Product | null> {
    try {
      const product = await withAuthRetry(() =>
        apiFetch<Product>('/products', { method: 'POST', body: JSON.stringify(data) }),
      )
      products.value.push(product)
      return product
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al crear el producto'
      return null
    }
  }

  async function updateProduct(id: string, data: Partial<Product>): Promise<Product | null> {
    try {
      const product = await withAuthRetry(() =>
        apiFetch<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      )
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = product
      return product
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al actualizar el producto'
      return null
    }
  }

  async function deleteProduct(id: string): Promise<boolean> {
    try {
      await withAuthRetry(() => apiFetch(`/products/${id}`, { method: 'DELETE' }))
      products.value = products.value.filter((p) => p.id !== id)
      return true
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al eliminar el producto'
      return false
    }
  }

  async function toggleProductStatus(id: string): Promise<Product | null> {
    try {
      const product = await withAuthRetry(() =>
        apiFetch<Product>(`/products/${id}/toggle-status`, { method: 'PATCH' }),
      )
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = product
      return product
    } catch (err: unknown) {
      error.value = (err as { data?: { message?: string } })?.data?.message ?? 'Error al cambiar el estado'
      return null
    }
  }

  return {
    // state
    categories,
    products,
    loading,
    error,
    // computed
    categoriesWithProducts,
    totalProducts,
    availableProducts,
    lowStockProducts,
    // actions
    loadMenu,
    createCategory,
    updateCategory,
    deleteCategory,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleProductStatus,
  }
}
