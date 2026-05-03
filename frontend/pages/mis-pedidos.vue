<template>
  <div class="min-h-screen bg-gray-50 p-4 sm:p-6">
    <div class="max-w-4xl mx-auto">

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-black text-gray-900">Mis Pedidos</h1>
        <p class="text-sm text-gray-500 mt-0.5">Historial de tus compras y pedidos</p>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs text-gray-500 mb-1">Total</p>
          <p class="text-2xl font-black text-gray-900">{{ total }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs text-gray-500 mb-1">Pendientes</p>
          <p class="text-2xl font-black text-yellow-600">{{ countByStatus('PENDIENTE') }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs text-gray-500 mb-1">En Proceso</p>
          <p class="text-2xl font-black text-blue-600">{{ countByStatusProcessing() }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs text-gray-500 mb-1">Entregados</p>
          <p class="text-2xl font-black text-green-600">{{ countByStatus('ENTREGADO') }}</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex gap-2 mb-4 overflow-x-auto scrollbar-none pb-1">
        <button
          v-for="f in filters" :key="f.value"
          class="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          :class="activeFilter === f.value
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'"
          @click="activeFilter = f.value"
        >
          {{ f.label }}
          <span v-if="f.value !== 'ALL'" class="ml-1 opacity-70">({{ countByFilter(f.value) }})</span>
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4 text-sm text-red-700">{{ error }}</div>

      <!-- Skeleton -->
      <div v-if="loading" class="space-y-3">
        <div v-for="n in 4" :key="n" class="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-gray-200 rounded w-1/2" />
              <div class="h-3 bg-gray-200 rounded w-3/4" />
              <div class="h-3 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>

      <!-- Vacío -->
      <div v-else-if="filtered.length === 0" class="bg-white rounded-2xl border border-gray-100 py-16 text-center">
        <div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg class="w-7 h-7 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
          </svg>
        </div>
        <p class="text-sm font-bold text-gray-700 mb-1">Sin pedidos</p>
        <p class="text-xs text-gray-400">Aún no has realizado ningún pedido</p>
      </div>

      <!-- Lista -->
      <div v-else class="space-y-3">
        <div
          v-for="order in filtered"
          :key="order.id"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start gap-4">
            <!-- Icono comercio -->
            <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-black text-sm">
              {{ order.commerce?.name?.[0]?.toUpperCase() ?? 'C' }}
            </div>

            <div class="flex-1 min-w-0">
              <!-- Fila superior -->
              <div class="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p class="text-sm font-bold text-gray-900">{{ order.commerce?.name ?? 'Comercio' }}</p>
                  <p class="text-xs text-blue-600 font-semibold truncate">{{ order.orderNumber }}</p>
                </div>
                <span class="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full" :class="statusClass(order.status)">
                  {{ STATUS_LABELS[order.status] }}
                </span>
              </div>

              <!-- Detalles -->
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  {{ order.itemCount }} ítems
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {{ formatCurrency(order.total) }}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  {{ formatDate(order.createdAt) }}
                </span>
                <span v-if="order.orderType" class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                  {{ ORDER_TYPE_LABELS[order.orderType] }}
                </span>
              </div>

              <!-- Items -->
              <div v-if="order.items?.length" class="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-3">
                <p v-for="item in order.items.slice(0, 3)" :key="item.id" class="truncate">
                  • {{ item.quantity }}x {{ item.productName }}
                </p>
                <p v-if="order.items.length > 3" class="text-gray-400 mt-1">+ {{ order.items.length - 3 }} más...</p>
              </div>

              <!-- Dirección -->
              <p v-if="order.deliveryAddress" class="text-xs text-gray-400 flex items-center gap-1 mb-2">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                </svg>
                {{ order.deliveryAddress }}
              </p>

              <p class="text-[10px] text-gray-400 mt-2">Pedido realizado {{ timeAgo(order.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

import { ref, computed, onMounted } from 'vue'

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string
const { getHeaders } = useAuth()

interface OrderItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  subtotal: number
  notes?: string
}

interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  deliveryAddress?: string
  status: 'PENDIENTE' | 'CONFIRMADO' | 'PREPARANDO' | 'LISTO' | 'EN_ENTREGA' | 'ENTREGADO' | 'CANCELADO'
  orderType: 'INMEDIATO' | 'PROGRAMADO'
  paymentMethod: string
  total: number
  itemCount: number
  items: OrderItem[]
  commerce?: { id: string; name: string }
  createdAt: string
}

const STATUS_LABELS: Record<Order['status'], string> = {
  PENDIENTE: 'Pendiente',
  CONFIRMADO: 'Confirmado',
  PREPARANDO: 'Preparando',
  LISTO: 'Listo',
  EN_ENTREGA: 'En Entrega',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
}

const STATUS_CLASSES: Record<Order['status'], string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  PREPARANDO: 'bg-orange-100 text-orange-700',
  LISTO: 'bg-purple-100 text-purple-700',
  EN_ENTREGA: 'bg-indigo-100 text-indigo-700',
  ENTREGADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-700',
}

const ORDER_TYPE_LABELS: Record<Order['orderType'], string> = {
  INMEDIATO: 'Inmediato',
  PROGRAMADO: 'Programado',
}

const filters = [
  { value: 'ALL', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'PROCESSING', label: 'En Proceso' },
  { value: 'ENTREGADO', label: 'Entregados' },
  { value: 'CANCELADO', label: 'Cancelados' },
]

const orders = ref<Order[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const activeFilter = ref('ALL')

const filtered = computed(() => {
  if (activeFilter.value === 'ALL') return orders.value
  if (activeFilter.value === 'PROCESSING') {
    const processing = ['CONFIRMADO', 'PREPARANDO', 'LISTO', 'EN_ENTREGA']
    return orders.value.filter((r: Order) => processing.includes(r.status))
  }
  return orders.value.filter((r: Order) => r.status === activeFilter.value)
})

function countByStatus(status: Order['status']) {
  return orders.value.filter((r: Order) => r.status === status).length
}

function countByStatusProcessing() {
  const processing = ['CONFIRMADO', 'PREPARANDO', 'LISTO', 'EN_ENTREGA']
  return orders.value.filter((r: Order) => processing.includes(r.status)).length
}

function countByFilter(filterValue: string) {
  if (filterValue === 'ALL') return total.value
  if (filterValue === 'PROCESSING') return countByStatusProcessing()
  return countByStatus(filterValue as Order['status'])
}

function statusClass(status: Order['status']) {
  return STATUS_CLASSES[status]
}

async function fetchOrders() {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{ data: Order[]; total: number }>(
      `${apiUrl}/orders/mine`,
      { headers: getHeaders() }
    )
    orders.value = res.data
    total.value = res.total
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error al cargar pedidos'
  } finally {
    loading.value = false
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)} días`
}

onMounted(fetchOrders)
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
