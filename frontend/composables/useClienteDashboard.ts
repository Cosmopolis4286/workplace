import { ref, computed } from 'vue'
import { useAuth } from './useAuth'

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'PENDIENTE'
  | 'CONFIRMADO'
  | 'PREPARANDO'
  | 'LISTO'
  | 'EN_ENTREGA'
  | 'ENTREGADO'
  | 'CANCELADO'

export type OrderType = 'INMEDIATO' | 'PROGRAMADO' | 'PARA_LLEVAR' | 'EN_SITIO'
export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'EN_LINEA'
export type PaymentStatus = 'PENDIENTE' | 'PAGADO' | 'REEMBOLSADO'

export interface OrderItem {
  id: string
  orderId: string
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
  createdAt: string
}

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  deliveryAddress?: string
  notes?: string
  status: OrderStatus
  orderType: OrderType
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  subtotal: number
  tax: number
  deliveryFee: number
  discount: number
  total: number
  scheduledAt?: string
  completedAt?: string
  cancelledAt?: string
  cancelReason?: string
  customerId?: string
  customer?: { id: string; name: string; segment: string; totalOrders?: number }
  items: OrderItem[]
  itemCount?: number
  restaurantId: string
  createdAt: string
  updatedAt: string
}

export interface OrderStats {
  totalOrders: number
  activeOrders: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  monthlyRevenue: number
  avgTicket: number
}

export interface CreateOrderItemPayload {
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  notes?: string
}

export interface CreateOrderPayload {
  customerName: string
  customerPhone?: string
  customerEmail?: string
  deliveryAddress?: string
  notes?: string
  orderType?: OrderType
  paymentMethod?: PaymentMethod
  deliveryFee?: number
  discount?: number
  scheduledAt?: string
  customerId?: string
  items: CreateOrderItemPayload[]
}

export interface UpdateOrderPayload {
  status?: OrderStatus
  paymentMethod?: PaymentMethod
  paymentStatus?: PaymentStatus
  deliveryAddress?: string
  notes?: string
  cancelReason?: string
}

export interface OrderFilters {
  status?: OrderStatus
  orderType?: OrderType
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

// ─── Status maps ──────────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDIENTE:   'Pendiente',
  CONFIRMADO:  'Confirmado',
  PREPARANDO:  'Preparando',
  LISTO:       'Listo',
  EN_ENTREGA:  'En Entrega',
  ENTREGADO:   'Entregado',
  CANCELADO:   'Cancelado',
}

export const ORDER_STATUS_CLASSES: Record<OrderStatus, string> = {
  PENDIENTE:   'bg-yellow-100 text-yellow-800',
  CONFIRMADO:  'bg-blue-100 text-blue-800',
  PREPARANDO:  'bg-indigo-100 text-indigo-800',
  LISTO:       'bg-green-100 text-green-800',
  EN_ENTREGA:  'bg-purple-100 text-purple-800',
  ENTREGADO:   'bg-gray-100 text-gray-700',
  CANCELADO:   'bg-red-100 text-red-800',
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  INMEDIATO:  'Inmediato',
  PROGRAMADO: 'Programado',
  PARA_LLEVAR: 'Para Llevar',
  EN_SITIO:   'En Sitio',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO:      'Efectivo',
  TARJETA:       'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  EN_LINEA:      'En Línea',
}

// Valid next statuses for progression UI
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  PENDIENTE:  ['CONFIRMADO', 'CANCELADO'],
  CONFIRMADO: ['PREPARANDO', 'CANCELADO'],
  PREPARANDO: ['LISTO', 'CANCELADO'],
  LISTO:      ['EN_ENTREGA', 'ENTREGADO'],
  EN_ENTREGA: ['ENTREGADO'],
}

// ─── Active statuses (non-terminal) ──────────────────────────────────────────
const ACTIVE_STATUSES: OrderStatus[] = ['PENDIENTE', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'EN_ENTREGA']

// ─── Composable ───────────────────────────────────────────────────────────────

const orders    = ref<Order[]>([])
const stats     = ref<OrderStats>({
  totalOrders: 0,
  activeOrders: 0,
  pendingOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  monthlyRevenue: 0,
  avgTicket: 0,
})
const loading        = ref(false)
const loadingStats   = ref(false)
const error          = ref<string | null>(null)
const totalCount     = ref(0)
const currentPage    = ref(1)

export function useClienteDashboard() {
  const { token, refreshTokens } = useAuth()

  const activeOrders  = computed(() => orders.value.filter(o => ACTIVE_STATUSES.includes(o.status)))
  const recentOrders  = computed(() => orders.value.filter(o => !ACTIVE_STATUSES.includes(o.status)))

  // ── Auth-aware fetch ────────────────────────────────────────────────────────
  async function apiFetch(path: string, options: RequestInit = {}) {
    const config = useRuntimeConfig()
    const base   = config.public.apiUrl

    const doRequest = async (tkn: string) => {
      return fetch(`${base}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tkn}`,
          ...(options.headers ?? {}),
        },
      })
    }

    let res = await doRequest(token.value)
    if (res.status === 401) {
      const ok = await refreshTokens()
      if (!ok) throw new Error('Sesión expirada')
      res = await doRequest(token.value)
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.message ?? `Error ${res.status}`)
    }
    return res.json()
  }

  // ── Load stats ──────────────────────────────────────────────────────────────
  async function loadStats() {
    loadingStats.value = true
    try {
      stats.value = await apiFetch('/api/orders/stats')
    } catch (e: any) {
      error.value = e.message
    } finally {
      loadingStats.value = false
    }
  }

  // ── Load orders ─────────────────────────────────────────────────────────────
  async function loadOrders(filters: OrderFilters = {}) {
    loading.value = true
    error.value   = null
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
      })
      const qs = params.toString()
      const res = await apiFetch(`/api/orders${qs ? '?' + qs : ''}`)
      orders.value   = res.data
      totalCount.value = res.total
      currentPage.value = res.page
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  // ── Create order ────────────────────────────────────────────────────────────
  async function createOrder(payload: CreateOrderPayload): Promise<Order | null> {
    loading.value = true
    error.value   = null
    try {
      const order = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      orders.value.unshift({ ...order, itemCount: order.items?.length ?? 0 })
      await loadStats()
      return order
    } catch (e: any) {
      error.value = e.message
      return null
    } finally {
      loading.value = false
    }
  }

  // ── Update order (full) ─────────────────────────────────────────────────────
  async function updateOrder(id: string, payload: UpdateOrderPayload): Promise<Order | null> {
    try {
      const updated = await apiFetch(`/api/orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      const idx = orders.value.findIndex(o => o.id === id)
      if (idx !== -1) orders.value[idx] = { ...updated, itemCount: updated.items?.length ?? 0 }
      await loadStats()
      return updated
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // ── Patch status ────────────────────────────────────────────────────────────
  async function updateStatus(id: string, status: OrderStatus, cancelReason?: string): Promise<boolean> {
    try {
      const updated = await apiFetch(`/api/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, cancelReason }),
      })
      const idx = orders.value.findIndex(o => o.id === id)
      if (idx !== -1) orders.value[idx] = { ...updated, itemCount: updated.items?.length ?? 0 }
      await loadStats()
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // ── Delete order ─────────────────────────────────────────────────────────────
  async function deleteOrder(id: string): Promise<boolean> {
    try {
      await apiFetch(`/api/orders/${id}`, { method: 'DELETE' })
      orders.value = orders.value.filter(o => o.id !== id)
      await loadStats()
      return true
    } catch (e: any) {
      error.value = e.message
      return false
    }
  }

  // ── Get single ───────────────────────────────────────────────────────────────
  async function getOrder(id: string): Promise<Order | null> {
    try {
      return await apiFetch(`/api/orders/${id}`)
    } catch (e: any) {
      error.value = e.message
      return null
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value)
  }

  function formatDate(dateString?: string) {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('es-ES', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return {
    // state
    orders,
    stats,
    loading,
    loadingStats,
    error,
    totalCount,
    currentPage,
    // computed
    activeOrders,
    recentOrders,
    // actions
    loadOrders,
    loadStats,
    createOrder,
    updateOrder,
    updateStatus,
    deleteOrder,
    getOrder,
    // helpers
    formatCurrency,
    formatDate,
    // maps
    ORDER_STATUS_LABELS,
    ORDER_STATUS_CLASSES,
    ORDER_TYPE_LABELS,
    PAYMENT_METHOD_LABELS,
    NEXT_STATUS,
    ACTIVE_STATUSES,
  }
}
