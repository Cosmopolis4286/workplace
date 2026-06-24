import { ref, computed } from 'vue'
import { useApi } from './useApi'

export type ProductStatus = 'DISPONIBLE' | 'AGOTADO' | 'BAJO_STOCK' | 'NO_DISPONIBLE'

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
  preparationTime?: number
  calories?: number
  ingredients: string[]
  allergens: string[]
  categoryId: string
  category: { id: string; name: string; color: string }
  commerceId: string
}

// Estado global compartido
const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export const useMenu = () => {
  const { get, post, put, patch, del } = useApi()
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

  // ─── Load all ──────────────────────────────────────────────────────────────

  async function loadMenu() {
    loading.value = true
    error.value = null
    try {
      const [cats, prods] = await Promise.all([
        get<Category[]>('/menu/categories'),
        get<Product[]>('/menu/products'),
      ])
      categories.value = cats
      products.value = prods
    } catch (err: any) {
      error.value = err?.message ?? 'Error al cargar el menú'
      if (err?.status === 401) router.push('/login')
    } finally {
      loading.value = false
    }
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
      products.value.push(product)
      return product
    } catch (err: any) {
      error.value = err?.message ?? 'Error al crear el producto'
      return null
    }
  }

  async function updateProduct(id: string, data: Partial<Product>): Promise<Product | null> {
    try {
      const product = await put<Product>(`/menu/products/${id}`, data)
      const idx = products.value.findIndex((p) => p.id === id)
      if (idx !== -1) products.value[idx] = product
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
      return true
    } catch (err: any) {
      error.value = err?.message ?? 'Error al eliminar el producto'
      return false
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
    uploadProductImage,
  }
}
