import { ref, computed, readonly } from 'vue'
import { v4 as uuidv4 } from 'uuid'

type ProductStatus = 'disponible' | 'agotado' | 'bajo-stock'
type StockUpdateType = 'set' | 'add' | 'subtract'

interface Product {
  id: string
  name: string
  category: string
  price: number
  cost: number
  stock: number
  minStock: number
  maxStock: number
  unit: string
  status: ProductStatus
  image: string
  description: string
  ingredients: string[]
  preparationTime: number
  calories: number
  allergens: string[]
  createdAt: Date
  updatedAt: Date
}

interface Category {
  id: number
  name: string
  color: string
}

const products = ref<Product[]>([
  {
    id: uuidv4(),
    name: 'Pizza Margherita',
    category: 'Pizzas',
    price: 15.99,
    cost: 8.50,
    stock: 25,
    minStock: 5,
    maxStock: 50,
    unit: 'unidad',
    status: 'disponible',
    image: 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop',
    description: 'Pizza clásica con tomate, mozzarella y albahaca',
    ingredients: ['Masa', 'Salsa de tomate', 'Mozzarella', 'Albahaca'],
    preparationTime: 15,
    calories: 250,
    allergens: ['Gluten', 'Lácteos'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: uuidv4(),
    name: 'Hamburguesa Clásica',
    category: 'Hamburguesas',
    price: 12.50,
    cost: 6.75,
    stock: 15,
    minStock: 3,
    maxStock: 30,
    unit: 'unidad',
    status: 'disponible',
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&fit=crop',
    description: 'Hamburguesa con carne de res, lechuga, tomate y queso',
    ingredients: ['Pan', 'Carne de res', 'Lechuga', 'Tomate', 'Queso'],
    preparationTime: 12,
    calories: 450,
    allergens: ['Gluten', 'Lácteos'],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-14'),
  },
])

const categories = ref<Category[]>([
  { id: 1, name: 'Pizzas', color: '#ef4444' },
  { id: 2, name: 'Hamburguesas', color: '#f97316' },
  { id: 3, name: 'Bebidas', color: '#3b82f6' },
  { id: 4, name: 'Postres', color: '#8b5cf6' },
  { id: 5, name: 'Ensaladas', color: '#10b981' },
])

export const useInventory = () => {
  const lowStockProducts = computed(() =>
    products.value.filter((p) => p.stock <= p.minStock),
  )

  const outOfStockProducts = computed(() =>
    products.value.filter((p) => p.stock === 0),
  )

  const totalProducts = computed(() => products.value.length)

  const totalValue = computed(() =>
    products.value.reduce((sum, p) => sum + p.price * p.stock, 0),
  )

  function addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const newProduct: Product = { ...product, id: uuidv4(), createdAt: new Date(), updatedAt: new Date() }
    products.value.push(newProduct)
    return newProduct
  }

  function updateProduct(id: string, updates: Partial<Product>): void {
    const index = products.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      products.value[index] = { ...products.value[index], ...updates, updatedAt: new Date() }
    }
  }

  function deleteProduct(id: string): void {
    const index = products.value.findIndex((p) => p.id === id)
    if (index !== -1) products.value.splice(index, 1)
  }

  function updateStock(id: string, quantity: number, type: StockUpdateType = 'set'): void {
    const product = products.value.find((p) => p.id === id)
    if (!product) return

    if (type === 'add') product.stock += quantity
    else if (type === 'subtract') product.stock = Math.max(0, product.stock - quantity)
    else product.stock = quantity

    product.updatedAt = new Date()
    if (product.stock === 0) product.status = 'agotado'
    else if (product.stock <= product.minStock) product.status = 'bajo-stock'
    else product.status = 'disponible'
  }

  function addCategory(category: Omit<Category, 'id'>): Category {
    const newCategory: Category = {
      ...category,
      id: Math.max(...categories.value.map((c) => c.id), 0) + 1,
    }
    categories.value.push(newCategory)
    return newCategory
  }

  function deleteCategory(id: number): void {
    const index = categories.value.findIndex((c) => c.id === id)
    if (index !== -1) categories.value.splice(index, 1)
  }

  return {
    products: readonly(products),
    categories: readonly(categories),
    lowStockProducts,
    outOfStockProducts,
    totalProducts,
    totalValue,
    addProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    addCategory,
    deleteCategory,
  }
}
