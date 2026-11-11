<template>
  <div class="card overflow-hidden">
    <div class="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-base">🛒</span>
        <h2 class="text-sm font-semibold text-gray-900">Pedidos del Marketplace</h2>
        <span v-if="pending > 0" class="badge bg-red-100 text-red-700 animate-pulse">{{ pending }} nuevos</span>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="statusFilter" class="input-field text-xs py-1 w-auto" @change="load">
          <option value="">Todos</option>
          <option value="PENDING">Pendiente</option>
          <option value="SEEN">Visto</option>
          <option value="CONTACTED">Contactado</option>
          <option value="CLOSED">Cerrado</option>
        </select>
        <button class="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" @click="load">
          <ArrowPathIcon class="h-4 w-4 text-gray-400" :class="{ 'animate-spin': loading }" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="divide-y divide-gray-100">
      <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-4">
        <div class="skeleton h-9 w-9 rounded-full flex-shrink-0" />
        <div class="flex-1 space-y-2"><div class="skeleton h-4 w-40 rounded" /><div class="skeleton h-3 w-56 rounded" /></div>
      </div>
    </div>

    <div v-else-if="!orders.length" class="p-10 text-center">
      <span class="text-3xl block mb-2">🛍️</span>
      <p class="text-sm text-gray-400">No hay pedidos del marketplace{{ statusFilter ? ' con este filtro' : '' }}</p>
    </div>

    <div v-else class="divide-y divide-gray-100">
      <div v-for="mo in orders" :key="mo.id" class="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors group">
        <div class="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 font-bold text-sm text-orange-700">
          {{ mo.buyerName.charAt(0).toUpperCase() }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <p class="text-sm font-semibold text-gray-900 truncate">{{ mo.buyerName }}</p>
            <span class="badge" :class="MKT_STATUS_CLASSES[mo.status]">{{ MKT_STATUS_LABELS[mo.status] }}</span>
          </div>
          <p class="text-xs text-gray-500 truncate">{{ itemsSummary(mo) }}</p>
          <p v-if="mo.address" class="text-xs text-gray-400 mt-0.5">📍 {{ mo.address }}{{ mo.city ? `, ${mo.city}` : '' }}</p>
          <ConversationChat
            v-if="chatOrderId === mo.id && currentUserId"
            class="mt-3"
            thread-type="CATALOG_ORDER"
            :thread-id="mo.id"
            :current-user-id="currentUserId"
            :title="`Chat con ${mo.buyerName}`"
            hint="Coordina la entrega por aquí. Por seguridad no se comparten teléfonos ni correos."
          />
        </div>
        <div class="flex-shrink-0 text-right space-y-1">
          <p v-if="mo.totalEstimate" class="text-sm font-bold text-gray-900">${{ formatPrice(mo.totalEstimate) }}</p>
          <p class="text-xs text-gray-400">{{ MKT_DELIVERY_LABELS[mo.deliveryType] }}</p>
          <p class="text-[10px] text-gray-400">{{ formatDateTimeShort(mo.createdAt) }}</p>
        </div>
        <div class="flex-shrink-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            v-if="mo.status === 'CONTACTED' && !mo.commerceCompletedAt"
            class="text-xs px-2 py-1 rounded-lg font-medium transition-colors bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            :disabled="updatingId === mo.id"
            title="El comprador tiene 72 h para confirmar o reportar un problema; si no, se cierra solo"
            @click="markDelivered(mo.id)"
          >Marcar entregado</button>
          <span v-else-if="mo.status === 'CONTACTED'" class="text-[10px] text-gray-500 text-center">Entregado · esperando al comprador</span>
          <button
            v-for="ns in MKT_NEXT_STATUS[mo.status]"
            :key="ns"
            class="text-xs px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :class="ns === 'CLOSED' ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-red-100 hover:bg-red-200 text-red-700'"
            :disabled="updatingId === mo.id"
            @click="updateStatus(mo.id, ns)"
          >{{ MKT_STATUS_LABELS[ns] }}</button>
          <button
            class="text-xs px-2 py-1 rounded-lg font-medium bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors"
            @click="chatOrderId = chatOrderId === mo.id ? null : mo.id"
          >{{ chatOrderId === mo.id ? 'Cerrar chat' : 'Chat' }}</button>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
      <span class="text-xs text-gray-400">Página {{ page }} de {{ totalPages }}</span>
      <div class="flex gap-2">
        <button class="btn-secondary text-xs px-2 py-1" :disabled="page <= 1" @click="changePage(page - 1)">‹</button>
        <button class="btn-secondary text-xs px-2 py-1" :disabled="page >= totalPages" @click="changePage(page + 1)">›</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { useApi } from '~/composables/core/useApi'
import { useDateFormat } from '~/composables/core/useDateFormat'
import ConversationChat from '~/components/conversations/ConversationChat.vue'
import { useAuth } from '~/composables/auth/useAuth'

const { user: authUser } = useAuth()
const currentUserId = computed(() => authUser.value?.id ?? '')
const chatOrderId = ref<string | null>(null)

type MktOrderStatus = 'PENDING' | 'SEEN' | 'CONTACTED' | 'CLOSED'
type MktDeliveryType = 'HOME_DELIVERY' | 'PICKUP' | 'DIGITAL'
interface MktOrderItem { productId: string; productName: string; unitPrice: number; quantity: number; isBundle: boolean }
interface MktOrder { id: string; commerceCompletedAt?: string | null; items: MktOrderItem[]; deliveryType: MktDeliveryType; address?: string; city?: string; buyerName: string; buyerPhone: string; buyerEmail?: string; notes?: string; totalEstimate?: number; status: MktOrderStatus; createdAt: string }

function itemsSummary(order: MktOrder): string {
  if (!order.items?.length) return ''
  if (order.items.length === 1) return `${order.items[0].productName} × ${order.items[0].quantity}`
  const totalQty = order.items.reduce((sum, i) => sum + i.quantity, 0)
  return `${totalQty} productos (${order.items.length} tipos)`
}

const MKT_STATUS_LABELS: Record<MktOrderStatus, string>  = { PENDING: 'Pendiente', SEEN: 'Visto', CONTACTED: 'Contactado', CLOSED: 'Cerrado' }
const MKT_STATUS_CLASSES: Record<MktOrderStatus, string>  = { PENDING: 'bg-orange-100 text-orange-700', SEEN: 'bg-blue-100 text-blue-700', CONTACTED: 'bg-green-100 text-green-700', CLOSED: 'bg-gray-100 text-gray-500' }
const MKT_NEXT_STATUS: Record<MktOrderStatus, MktOrderStatus[]> = { PENDING: ['SEEN', 'CONTACTED'], SEEN: ['CONTACTED'], CONTACTED: [], CLOSED: [] }
const MKT_DELIVERY_LABELS: Record<MktDeliveryType, string> = { HOME_DELIVERY: '🛵 Domicilio', PICKUP: '🏪 Recoger', DIGITAL: '💻 Digital' }

const { formatDateTimeShort } = useDateFormat()

const orders = ref<MktOrder[]>([])
const loading = ref(false)
const page = ref(1)
const totalPages = ref(1)
const statusFilter = ref('')
const pending = computed(() => orders.value.filter(o => o.status === 'PENDING').length)

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({ page: String(page.value), limit: '50' })
    if (statusFilter.value) params.set('status', statusFilter.value)
    const { get } = useApi()
    const res = await get<{ data: MktOrder[]; totalPages: number }>(`/catalog/orders/mine?${params}`)
    orders.value = res.data; totalPages.value = res.totalPages
  } catch { } finally { loading.value = false }
}

const updatingId = ref<string | null>(null)
async function updateStatus(id: string, status: MktOrderStatus) {
  if (updatingId.value) return
  updatingId.value = id
  try {
    const { patch } = useApi()
    await patch(`/catalog/orders/${id}/status`, { status })
    const o = orders.value.find(o => o.id === id)
    if (o) o.status = status
  } catch { } finally {
    updatingId.value = null
  }
}

// El cierre (CLOSED) lo hace el comprador o el cierre automático; el comercio
// solo avisa que entregó.
async function markDelivered(id: string) {
  if (updatingId.value) return
  updatingId.value = id
  try {
    const { patch } = useApi()
    await patch(`/catalog/orders/${id}/delivered`, {})
    const o = orders.value.find(o => o.id === id)
    if (o) o.commerceCompletedAt = new Date().toISOString()
  } catch { } finally {
    updatingId.value = null
  }
}

function changePage(p: number) { page.value = p; load() }
function formatPrice(p: number) { return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(p) }

onMounted(load)
</script>
