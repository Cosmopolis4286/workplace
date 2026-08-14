<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- Lista principal -->
    <div class="lg:col-span-2 space-y-4">

      <!-- Filtros de estado -->
      <div class="card p-1 flex gap-1 overflow-x-auto scrollbar-none">
        <button
          v-for="f in filters"
          :key="f.value"
          class="flex-shrink-0 flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-colors whitespace-nowrap"
          :class="activeFilter === f.value
            ? 'bg-red-600 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
          @click="activeFilter = f.value"
        >
          {{ f.label }}
          <span
            v-if="f.value !== 'ALL' && countByFilter(f.value) > 0"
            class="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
            :class="activeFilter === f.value ? 'bg-red-500/30 text-red-100' : 'bg-gray-100 text-gray-500'"
          >{{ countByFilter(f.value) }}</span>
        </button>
      </div>

      <!-- Card con la lista -->
      <div class="card divide-y divide-gray-100">

        <!-- Skeleton -->
        <template v-if="loading">
          <div v-for="n in 4" :key="n" class="p-4 flex items-center gap-4">
            <div class="skeleton h-11 w-11 rounded-xl flex-shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="skeleton h-4 w-36 rounded" />
              <div class="skeleton h-3 w-52 rounded" />
              <div class="skeleton h-3 w-28 rounded" />
            </div>
            <div class="skeleton h-6 w-20 rounded-full" />
          </div>
        </template>

        <!-- Vacío -->
        <div v-else-if="filtered.length === 0" class="p-12 text-center">
          <ShoppingBagIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 font-medium">
            {{ activeFilter === 'ALL' ? 'Aún no has realizado ningún pedido' : 'No hay pedidos con este filtro' }}
          </p>
        </div>

        <!-- Filas -->
        <template v-else>
          <div
            v-for="order in filtered"
            :key="order.id"
            class="p-4 hover:bg-gray-50 transition-colors group"
            :class="{ 'cursor-pointer': order.items?.length }"
            @click="toggleExpand(order.id)"
          >
            <div class="flex items-start gap-4">
              <!-- Avatar comercio -->
              <div
                class="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
                :class="statusAvatarClass(order.status)"
              >
                {{ order.commerce?.name?.[0]?.toUpperCase() ?? 'C' }}
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between gap-2 mb-1">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-gray-900 truncate">
                      {{ order.commerce?.name ?? 'Comercio' }}
                    </p>
                    <p class="text-xs text-red-600 font-medium">{{ order.orderNumber }}</p>
                  </div>
                  <span class="badge flex-shrink-0" :class="STATUS_CLASSES[order.status]">
                    {{ STATUS_LABELS[order.status] }}
                  </span>
                </div>

                <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-1">
                  <span class="flex items-center gap-1">
                    <ArchiveBoxIcon class="h-3 w-3" />
                    {{ order.itemCount }} ítem{{ order.itemCount !== 1 ? 's' : '' }}
                  </span>
                  <span class="flex items-center gap-1">
                    <CurrencyDollarIcon class="h-3 w-3" />
                    {{ formatCurrency(order.total) }}
                  </span>
                  <span class="flex items-center gap-1">
                    <CalendarIcon class="h-3 w-3" />
                    {{ formatDate(order.createdAt) }}
                  </span>
                  <span v-if="order.orderType" class="flex items-center gap-1">
                    <BoltIcon class="h-3 w-3" />
                    {{ ORDER_TYPE_LABELS[order.orderType] }}
                  </span>
                  <span v-if="order.deliveryAddress" class="flex items-center gap-1">
                    <MapPinIcon class="h-3 w-3" />
                    {{ order.deliveryAddress }}
                  </span>
                </div>
                <button
                  class="text-[11px] text-gray-400 hover:text-red-500 font-medium mt-1.5"
                  @click.stop="$emit('report', order)"
                >
                  ¿Tuviste un problema? Reportarlo
                </button>
              </div>

              <!-- Chevron expandible -->
              <ChevronDownIcon
                v-if="order.items?.length"
                class="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-all flex-shrink-0 mt-0.5"
                :class="expanded.has(order.id) ? 'rotate-180' : ''"
              />
            </div>

            <!-- Detalle expandible -->
            <Transition
              enter-active-class="duration-200 ease-out"
              enter-from-class="opacity-0 -translate-y-1"
              enter-to-class="opacity-100 translate-y-0"
              leave-active-class="duration-150 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <div v-if="expanded.has(order.id) && order.items?.length" class="mt-3 ml-15 pl-[60px]">
                <div class="bg-gray-50 rounded-xl px-3 py-2.5 space-y-1.5">
                  <div
                    v-for="item in order.items"
                    :key="item.id"
                    class="flex items-center justify-between text-xs"
                  >
                    <span class="text-gray-700 truncate flex-1">
                      <span class="font-semibold text-gray-900">{{ item.quantity }}×</span>
                      {{ item.productName }}
                    </span>
                    <span class="text-gray-500 flex-shrink-0 ml-3">{{ formatCurrency(item.subtotal) }}</span>
                  </div>
                  <div v-if="order.platformFeePayer === 'CLIENT' && order.platformFeeAmount" class="border-t border-gray-200 pt-1.5 flex justify-between text-xs text-blue-600">
                    <span>Tasa de servicio ({{ order.platformFeeRate }}%)</span>
                    <span>+{{ formatCurrency(order.platformFeeAmount) }}</span>
                  </div>
                  <div class="border-t border-gray-200 pt-1.5 flex justify-between text-xs font-bold text-gray-900">
                    <span>Total</span>
                    <span>{{ formatCurrency(order.total) }}</span>
                  </div>
                </div>
                <p class="text-[10px] text-gray-400 mt-2 px-1">
                  Pedido realizado {{ timeAgo(order.createdAt) }}
                </p>
              </div>
            </Transition>
          </div>
        </template>
      </div>

      <p v-if="!loading && filtered.length > 0" class="text-xs text-gray-400 text-right px-1">
        {{ filtered.length }} pedido{{ filtered.length !== 1 ? 's' : '' }}
        {{ activeFilter !== 'ALL' ? `filtrados (de ${orders.length} cargados)` : `de ${total} en total` }}
      </p>

      <!-- Cargar más -->
      <div v-if="!loading && orders.length < total" class="text-center">
        <button class="btn-secondary text-sm" :disabled="loadingMore" @click="$emit('load-more')">
          {{ loadingMore ? 'Cargando...' : 'Cargar más pedidos' }}
        </button>
      </div>
    </div>

    <!-- Sidebar -->
    <div class="space-y-4">

      <!-- Resumen por estado -->
      <div class="card p-5">
        <h3 class="text-sm font-semibold text-gray-700 mb-4">Resumen</h3>
        <div class="space-y-3">
          <div v-for="s in statusSummary" :key="s.label" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
              <span class="text-sm text-gray-600">{{ s.label }}</span>
            </div>
            <span class="text-sm font-bold text-gray-900">{{ s.count }}</span>
          </div>
        </div>
      </div>

      <!-- Último pedido activo -->
      <div v-if="latestActive" class="card p-5 border-l-4 border-l-red-400">
        <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pedido activo</p>
        <div class="flex items-center gap-2 mb-1">
          <span class="badge" :class="STATUS_CLASSES[latestActive.status]">
            {{ STATUS_LABELS[latestActive.status] }}
          </span>
          <span class="text-xs text-gray-500">{{ latestActive.orderNumber }}</span>
        </div>
        <p class="text-sm font-semibold text-gray-900">{{ latestActive.commerce?.name ?? 'Comercio' }}</p>
        <p class="text-xs text-gray-400 mt-1">{{ formatCurrency(latestActive.total) }} · {{ timeAgo(latestActive.createdAt) }}</p>
      </div>

      <!-- Gasto total -->
      <div v-if="totalSpent > 0" class="card p-5">
        <p class="text-xs text-gray-500 mb-1">Total gastado</p>
        <p class="text-2xl font-black text-gray-900">{{ formatCurrency(totalSpent) }}</p>
        <p class="text-xs text-gray-400 mt-1">en {{ stats?.completedOrders ?? 0 }} pedido{{ (stats?.completedOrders ?? 0) !== 1 ? 's' : '' }} entregado{{ (stats?.completedOrders ?? 0) !== 1 ? 's' : '' }}</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ShoppingBagIcon, ArchiveBoxIcon, CurrencyDollarIcon, CalendarIcon, BoltIcon, MapPinIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import { useDateFormat } from '~/composables/core/useDateFormat'

export interface OrderItem {
  id: string; productId: string; productName: string
  quantity: number; unitPrice: number; subtotal: number; notes?: string
}

export interface FoodOrder {
  id: string; orderNumber: string; customerName: string
  customerPhone?: string; customerEmail?: string; deliveryAddress?: string
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED'
  orderType: 'IMMEDIATE' | 'SCHEDULED'
  paymentMethod: string; total: number; itemCount: number
  platformFeeRate?: number | null; platformFeeAmount?: number | null; platformFeePayer?: 'CLIENT' | 'PROVIDER' | null
  items: OrderItem[]; commerce?: { id: string; name: string }; createdAt: string
}

export interface MyOrdersStats {
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  completedOrders: number
  cancelledOrders: number
  totalSpent: number
}

const props = defineProps<{
  orders: FoodOrder[]
  total: number
  stats: MyOrdersStats | null
  loading: boolean
  loadingMore: boolean
}>()

defineEmits<{
  'load-more': []
  report: [order: FoodOrder]
}>()

const { formatDate: fmtDate } = useDateFormat()

const STATUS_LABELS: Record<FoodOrder['status'], string> = {
  PENDING: 'Pendiente', CONFIRMED: 'Confirmado', PREPARING: 'Preparando',
  READY: 'Listo', OUT_FOR_DELIVERY: 'En Entrega', DELIVERED: 'Entregado', CANCELLED: 'Cancelado',
}

const STATUS_CLASSES: Record<FoodOrder['status'], string> = {
  PENDING:          'bg-yellow-100 text-yellow-800',
  CONFIRMED:        'bg-blue-100 text-blue-700',
  PREPARING:        'bg-orange-100 text-orange-700',
  READY:            'bg-purple-100 text-purple-700',
  OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
  DELIVERED:        'bg-green-100 text-green-700',
  CANCELLED:        'bg-red-100 text-red-700',
}

const ORDER_TYPE_LABELS: Record<FoodOrder['orderType'], string> = {
  IMMEDIATE: 'Inmediato', SCHEDULED: 'Programado',
}

const PROCESSING = ['CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY']

const filters = [
  { value: 'ALL',        label: 'Todos'      },
  { value: 'PENDING',    label: 'Pendientes' },
  { value: 'PROCESSING', label: 'En Proceso' },
  { value: 'DELIVERED',  label: 'Entregados' },
  { value: 'CANCELLED',  label: 'Cancelados' },
]

const activeFilter = ref('ALL')
const expanded = ref<Set<string>>(new Set())

const filtered = computed(() => {
  if (activeFilter.value === 'ALL') return props.orders
  if (activeFilter.value === 'PROCESSING')
    return props.orders.filter(o => PROCESSING.includes(o.status))
  return props.orders.filter(o => o.status === activeFilter.value)
})

const statusSummary = computed(() => [
  { label: 'Pendientes',  count: props.stats?.pendingOrders ?? 0,    dot: 'bg-yellow-400' },
  { label: 'En Proceso',  count: props.stats?.processingOrders ?? 0, dot: 'bg-blue-400'   },
  { label: 'Entregados',  count: props.stats?.completedOrders ?? 0,  dot: 'bg-green-400'  },
  { label: 'Cancelados',  count: props.stats?.cancelledOrders ?? 0,  dot: 'bg-red-400'    },
])

const latestActive = computed(() =>
  props.orders.find(o => PROCESSING.includes(o.status) || o.status === 'PENDING') ?? null
)

const totalSpent = computed(() => props.stats?.totalSpent ?? 0)

function countByStatus(s: FoodOrder['status']) {
  return props.orders.filter(o => o.status === s).length
}
function countByStatusProcessing() {
  return props.orders.filter(o => PROCESSING.includes(o.status)).length
}
function countByFilter(v: string) {
  if (v === 'ALL')        return props.total
  if (v === 'PENDING')    return props.stats?.pendingOrders ?? countByStatus('PENDING')
  if (v === 'PROCESSING') return props.stats?.processingOrders ?? countByStatusProcessing()
  if (v === 'DELIVERED')  return props.stats?.completedOrders ?? countByStatus('DELIVERED')
  if (v === 'CANCELLED')  return props.stats?.cancelledOrders ?? countByStatus('CANCELLED')
  return countByStatus(v as FoodOrder['status'])
}

function statusAvatarClass(status: FoodOrder['status']) {
  const map: Record<FoodOrder['status'], string> = {
    PENDING:          'bg-yellow-100 text-yellow-700',
    CONFIRMED:        'bg-blue-100 text-blue-700',
    PREPARING:        'bg-orange-100 text-orange-700',
    READY:            'bg-purple-100 text-purple-700',
    OUT_FOR_DELIVERY: 'bg-indigo-100 text-indigo-700',
    DELIVERED:        'bg-green-100 text-green-700',
    CANCELLED:        'bg-red-100 text-red-600',
  }
  return map[status]
}

function toggleExpand(id: string) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function formatCurrency(v: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(v)
}
function formatDate(d: string) { return fmtDate(d) }
function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)  return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)} días`
}
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
