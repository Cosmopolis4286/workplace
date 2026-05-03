import { ref, computed } from 'vue'
import type { CatalogProduct } from '~/composables/useCatalog'

export interface CartItem {
  product: CatalogProduct
  quantity: number
}

export interface CartGroup {
  commerceId: string
  commerceName: string
  items: CartItem[]
  subtotal: number
}

// ─── Singleton state ─────────────────────────────────────────────────────────
const items = ref<CartItem[]>([])
const isOpen = ref(false)

// ─── Computed ────────────────────────────────────────────────────────────────
const totalItems = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))

const totalPrice = computed(() =>
  items.value.reduce((sum, i) => sum + i.product.price * i.quantity, 0)
)

const groupedByCommerce = computed<CartGroup[]>(() => {
  const map = new Map<string, CartGroup>()
  for (const item of items.value) {
    const cid = item.product.commerce.id
    if (!map.has(cid)) {
      map.set(cid, {
        commerceId: cid,
        commerceName: item.product.commerce.name,
        items: [],
        subtotal: 0,
      })
    }
    const group = map.get(cid)!
    group.items.push(item)
    group.subtotal += item.product.price * item.quantity
  }
  return [...map.values()]
})

// ─── Actions ─────────────────────────────────────────────────────────────────
function addItem(product: CatalogProduct, qty = 1) {
  const existing = items.value.find(i => i.product.id === product.id)
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, 99)
  } else {
    items.value.push({ product, quantity: qty })
  }
}

function removeItem(productId: string) {
  const idx = items.value.findIndex(i => i.product.id === productId)
  if (idx !== -1) items.value.splice(idx, 1)
}

function setQuantity(productId: string, qty: number) {
  if (qty <= 0) { removeItem(productId); return }
  const item = items.value.find(i => i.product.id === productId)
  if (item) item.quantity = Math.min(qty, 99)
}

function increment(productId: string) {
  const item = items.value.find(i => i.product.id === productId)
  if (item) item.quantity = Math.min(item.quantity + 1, 99)
}

function decrement(productId: string) {
  const item = items.value.find(i => i.product.id === productId)
  if (!item) return
  if (item.quantity <= 1) removeItem(productId)
  else item.quantity--
}

function clearCommerce(commerceId: string) {
  items.value = items.value.filter(i => i.product.commerce.id !== commerceId)
}

function clearAll() {
  items.value = []
}

function getQuantity(productId: string): number {
  return items.value.find(i => i.product.id === productId)?.quantity ?? 0
}

function inCart(productId: string): boolean {
  return items.value.some(i => i.product.id === productId)
}

function openCart() { isOpen.value = true }
function closeCart() { isOpen.value = false }
function toggleCart() { isOpen.value = !isOpen.value }

export function useCart() {
  return {
    items,
    isOpen,
    totalItems,
    totalPrice,
    groupedByCommerce,
    addItem,
    removeItem,
    setQuantity,
    increment,
    decrement,
    clearCommerce,
    clearAll,
    getQuantity,
    inCart,
    openCart,
    closeCart,
    toggleCart,
  }
}
