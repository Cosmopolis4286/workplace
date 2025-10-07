import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'

const products = ref([
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
    updatedAt: new Date('2024-01-15')
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
    updatedAt: new Date('2024-01-14')
  }
])

const categories = ref([
  { id: 1, name: 'Pizzas', color: '#ef4444' },
  { id: 2, name: 'Hamburguesas', color: '#f97316' },
  { id: 3, name: 'Bebidas', color: '#3b82f6' },
  { id: 4, name: 'Postres', color: '#8b5cf6' },
  { id: 5, name: 'Ensaladas', color: '#10b981' }
])

export const useInventory = () => {
  const lowStockProducts = computed(() => 
    products.value.filter(p => p.stock <= p.minStock)
  )

  const outOfStockProducts = computed(() => 
    products.value.filter(p => p.stock === 0)
  )

  const totalProducts = computed(() => products.value.length)

  const totalValue = computed(() => 
    products.value.reduce((sum, p) => sum + (p.price * p.stock), 0)
  )

  const addProduct = (product) => {
    const newProduct = {
      ...product,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    products.value.push(newProduct)
    return newProduct
  }

  const updateProduct = (id, updates) => {
    const index = products.value.findIndex(p => p.id === id)
    if (index !== -1) {
      products.value[index] = {
        ...products.value[index],
        ...updates,
        updatedAt: new Date()
      }
    }
  }

  const deleteProduct = (id) => {
    const index = products.value.findIndex(p => p.id === id)
    if (index !== -1) {
      products.value.splice(index, 1)
    }
  }

  const updateStock = (id, quantity, type = 'set') => {
    const product = products.value.find(p => p.id === id)
    if (product) {
      if (type === 'add') {
        product.stock += quantity
      } else if (type === 'subtract') {
        product.stock = Math.max(0, product.stock - quantity)
      } else {
        product.stock = quantity
      }
      product.updatedAt = new Date()
      
      // Update status based on stock
      if (product.stock === 0) {
        product.status = 'agotado'
      } else if (product.stock <= product.minStock) {
        product.status = 'bajo-stock'
      } else {
        product.status = 'disponible'
      }
    }
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
    updateStock
  }
}