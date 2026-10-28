<template>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-4">
      <div class="card p-1 flex gap-1 overflow-x-auto scrollbar-none">
        <button
          v-for="f in catalogFilters"
          :key="f.value"
          class="flex-shrink-0 flex-1 text-sm py-2 px-3 rounded-lg font-medium transition-colors whitespace-nowrap"
          :class="activeFilter === f.value
            ? 'bg-red-600 text-white shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'"
          @click="activeFilter = f.value"
        >
          {{ f.label }}
          <span
            v-if="f.value !== 'ALL' && countByStatus(f.value) > 0"
            class="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
            :class="activeFilter === f.value ? 'bg-red-500/30 text-red-100' : 'bg-gray-100 text-gray-500'"
          >{{ countByStatus(f.value) }}</span>
        </button>
      </div>

      <div class="card divide-y divide-gray-100">
        <template v-if="loading">
          <div v-for="n in 4" :key="n" class="p-4 flex items-center gap-4">
            <div class="skeleton h-11 w-11 rounded-xl flex-shrink-0" />
            <div class="flex-1 space-y-2">
              <div class="skeleton h-4 w-36 rounded" />
              <div class="skeleton h-3 w-52 rounded" />
            </div>
            <div class="skeleton h-6 w-20 rounded-full" />
          </div>
        </template>

        <div v-else-if="filteredOrders.length === 0" class="p-12 text-center">
          <ShoppingBagIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 font-medium">
            {{ activeFilter === 'ALL' ? 'Aún no has hecho pedidos en el catálogo' : 'No hay pedidos con este filtro' }}
          </p>
          <p class="text-sm text-gray-400 mt-1">Explora el catálogo de comercios y haz tu primer pedido.</p>
        </div>

        <template v-else>
          <div
            v-for="order in filteredOrders"
            :key="order.id"
            class="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer"
            @click="selectedOrder = order"
          >
            <div
              class="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
              :class="statusAvatarClass(order.status)"
            >
              {{ order.commerceName?.[0]?.toUpperCase() ?? 'C' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2 mb-1">
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-gray-900 truncate">{{ order.commerceName }}</p>
                  <p class="text-xs text-red-600 font-medium truncate">{{ itemsSummary(order) }}</p>
                </div>
                <span class="badge flex-shrink-0" :class="STATUS_CLASSES[order.status]">
                  {{ STATUS_LABELS[order.status] }}
                </span>
              </div>
              <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-1">
                <span v-if="order.totalEstimate" class="flex items-center gap-1">
                  <CurrencyDollarIcon class="h-3 w-3" />
                  {{ formatCurrency(order.totalEstimate) }}
                </span>
                <span class="flex items-center gap-1">
                  <CalendarIcon class="h-3 w-3" />
                  {{ formatDate(order.createdAt) }}
                </span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <p v-if="!loading && filteredOrders.length > 0" class="text-xs text-gray-400 text-right px-1">
        {{ filteredOrders.length }} pedido{{ filteredOrders.length !== 1 ? 's' : '' }} de catálogo
      </p>
    </div>

    <div class="space-y-4">
      <div class="card p-5 border-l-4 border-l-blue-400">
        <div class="flex items-center gap-2 mb-1">
          <InformationCircleIcon class="h-4 w-4 text-blue-500" />
          <p class="text-sm font-semibold text-gray-700">¿Cómo funciona?</p>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Cuando el comercio te contacte y recibas tu pedido, ábrelo y confirma la recepción. Esto habilita tu reseña verificada para ese comercio.
        </p>
      </div>
    </div>
  </div>

  <!-- Modal detalle pedido de catálogo -->
  <Teleport to="body">
    <div v-if="selectedOrder" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="selectedOrder = null" />
      <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div class="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 class="font-black text-gray-900">{{ selectedOrder.commerceName }}</h3>
          </div>
          <span class="badge flex-shrink-0" :class="STATUS_CLASSES[selectedOrder.status]">
            {{ STATUS_LABELS[selectedOrder.status] }}
          </span>
        </div>
        <div class="p-6 space-y-3">
          <div v-for="item in selectedOrder.items" :key="item.productId" class="flex justify-between text-sm">
            <span class="text-gray-600">
              {{ item.quantity }}× {{ item.productName }}
              <span v-if="item.isBundle" class="text-[10px] font-bold text-purple-600">📦</span>
            </span>
            <span class="text-gray-900">{{ formatCurrency(item.unitPrice * item.quantity) }}</span>
          </div>
          <div v-if="selectedOrder.totalEstimate" class="flex justify-between text-sm pt-2 border-t border-gray-100">
            <span class="text-gray-500 font-semibold">Total estimado</span>
            <span class="font-bold text-gray-900">{{ formatCurrency(selectedOrder.totalEstimate) }}</span>
          </div>
          <div v-if="selectedOrder.address" class="flex justify-between text-sm">
            <span class="text-gray-500">Dirección</span>
            <span class="text-gray-900 text-right">{{ selectedOrder.address }}{{ selectedOrder.city ? `, ${selectedOrder.city}` : '' }}</span>
          </div>
          <div v-if="selectedOrder.notes" class="text-sm">
            <span class="text-gray-500">Notas: </span>
            <span class="text-gray-900 italic">"{{ selectedOrder.notes }}"</span>
          </div>
          <p class="text-xs text-gray-400">Pedido realizado {{ timeAgo(selectedOrder.createdAt) }}</p>
        </div>

        <!-- Pago directo al comercio (sin garantía interna): mismas condiciones
             que CatalogOrderPaymentSourceResolver -->
        <div v-if="canPayDirect(selectedOrder)" class="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
          <p class="text-xs text-gray-600">Paga directo al comercio y reporta la referencia.</p>
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 flex-shrink-0"
            @click="showPayModal = true"
          >
            Pagar al comercio
          </button>
        </div>

        <!-- Confirmar recepción: solo si el comercio ya contactó -->
        <div v-if="selectedOrder.status === 'CONTACTED'" class="p-4 border-t border-gray-100 bg-blue-50">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <p class="text-xs text-blue-700">Confirma cuando recibas tu pedido para poder dejar tu reseña.</p>
            <button
              :disabled="confirmingCompletion"
              class="px-4 py-2 rounded-lg text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 flex-shrink-0"
              @click="confirmCompletion"
            >
              {{ confirmingCompletion ? 'Confirmando…' : 'Confirmar recibido' }}
            </button>
          </div>
        </div>
        <div v-else-if="selectedOrder.status === 'CLOSED'" class="p-4 border-t border-gray-100 bg-green-50">
          <p class="text-xs text-green-700 font-medium">Pedido completado. Ya puedes dejar una reseña verificada en el perfil del comercio.</p>
        </div>

        <div class="p-4 border-t border-gray-100 flex items-center justify-between">
          <button class="text-xs text-gray-400 hover:text-red-500 font-medium" @click="showReportModal = true">
            ¿Tuviste un problema? Reportarlo
          </button>
          <button class="text-sm font-semibold text-gray-500 hover:text-gray-700" @click="selectedOrder = null">Cerrar</button>
        </div>
      </div>
    </div>
  </Teleport>

  <ReportProblemModal
    v-if="selectedOrder"
    v-model="showReportModal"
    entity-type="CATALOG_ORDER"
    :entity-id="selectedOrder.id"
  />
  <PayToSellerModal
    v-if="selectedOrder"
    :show="showPayModal"
    source-type="CATALOG_ORDER"
    :source-id="selectedOrder.id"
    :seller-name="selectedOrder.commerceName"
    @close="showPayModal = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ShoppingBagIcon, CurrencyDollarIcon, CalendarIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'
import ReportProblemModal from '~/components/modals/ReportProblemModal.vue'
import PayToSellerModal from '~/components/payments/PayToSellerModal.vue'
import { useApi } from '~/composables/core/useApi'
import { useDateFormat } from '~/composables/core/useDateFormat'

const props = defineProps<{
  active: boolean
}>()

interface CatalogOrderItem {
  productId: string
  productName: string
  unitPrice: number
  quantity: number
  isBundle: boolean
}

interface CatalogOrder {
  id: string
  commerceName: string
  items: CatalogOrderItem[]
  totalEstimate?: number
  address?: string
  city?: string
  notes?: string
  status: 'PENDING' | 'SEEN' | 'CONTACTED' | 'CLOSED' | 'CANCELLED'
  escrowStatus?: 'NONE' | 'HELD' | 'PENDING_FUNDS' | 'RELEASED' | 'REFUNDED'
  createdAt: string
}

const STATUS_LABELS: Record<CatalogOrder['status'], string> = {
  PENDING: 'Pendiente', SEEN: 'Visto', CONTACTED: 'Contactado', CLOSED: 'Completado', CANCELLED: 'Cancelado',
}
const STATUS_CLASSES: Record<CatalogOrder['status'], string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  SEEN:      'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  CLOSED:    'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const catalogFilters = [
  { value: 'ALL',       label: 'Todos'      },
  { value: 'PENDING',   label: 'Pendientes' },
  { value: 'CONTACTED', label: 'Contactados' },
  { value: 'CLOSED',    label: 'Completados' },
]

const { formatDate: fmtDate } = useDateFormat()

const orders = ref<CatalogOrder[]>([])
const loading = ref(false)
const activeFilter = ref('ALL')
const selectedOrder = ref<CatalogOrder | null>(null)
const showReportModal = ref(false)
const showPayModal = ref(false)

// Mismas condiciones que CatalogOrderPaymentSourceResolver: pedido abierto,
// con monto y sin garantía interna (escrow).
function canPayDirect(order: CatalogOrder) {
  return (
    !['CLOSED', 'CANCELLED'].includes(order.status) &&
    (order.escrowStatus ?? 'NONE') === 'NONE' &&
    Number(order.totalEstimate ?? 0) > 0
  )
}
const confirmingCompletion = ref(false)

const filteredOrders = computed(() =>
  activeFilter.value === 'ALL'
    ? orders.value
    : orders.value.filter((o) => o.status === activeFilter.value)
)

function countByStatus(status: string) {
  return orders.value.filter((o) => o.status === status).length
}

function itemsSummary(order: CatalogOrder): string {
  if (!order.items?.length) return ''
  if (order.items.length === 1) return `${order.items[0].quantity}× ${order.items[0].productName}`
  const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0)
  return `${totalQty} productos (${order.items.length} tipos)`
}

function statusAvatarClass(status: CatalogOrder['status']) {
  const map: Record<CatalogOrder['status'], string> = {
    PENDING:   'bg-yellow-100 text-yellow-700',
    SEEN:      'bg-gray-100 text-gray-600',
    CONTACTED: 'bg-blue-100 text-blue-700',
    CLOSED:    'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }
  return map[status]
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

async function fetchOrders() {
  loading.value = true
  try {
    const { get } = useApi()
    const res = await get<{ data: CatalogOrder[] }>('/catalog/orders/sent')
    orders.value = res.data
  } catch {
    // non-critical
  } finally {
    loading.value = false
  }
}

async function confirmCompletion() {
  if (!selectedOrder.value) return
  confirmingCompletion.value = true
  try {
    const { patch } = useApi()
    await patch(`/catalog/orders/${selectedOrder.value.id}/confirm-completion`, {})
    selectedOrder.value.status = 'CLOSED'
    const idx = orders.value.findIndex((o) => o.id === selectedOrder.value!.id)
    if (idx !== -1) orders.value[idx].status = 'CLOSED'
  } finally {
    confirmingCompletion.value = false
  }
}

watch(() => props.active, (active) => {
  if (active && orders.value.length === 0) fetchOrders()
}, { immediate: true })
</script>
