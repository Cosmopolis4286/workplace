<template>
  <div>
    <PageHeader
      title="Solicitudes de Servicio"
      :description="viewAs === 'provider' ? 'Solicitudes recibidas de tus clientes' : 'Solicitudes que has enviado a proveedores'"
      :icon="ClipboardDocumentListIcon"
      :breadcrumb="[{ label: 'Solicitudes de Servicio' }]"
      :stats="headerStats"
    >
      <template #actions>
        <!-- Toggle recibidas / enviadas — solo para PROFESIONAL (proveedores) -->
        <div v-if="!isNormal" class="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="viewAs === 'provider' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="switchView('provider')"
          >
            Recibidas
          </button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            :class="viewAs === 'client' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'"
            @click="switchView('client')"
          >
            Enviadas
          </button>
        </div>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="error = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <!-- Actualización disponible (vía notificación en vivo) -->
    <Transition enter-active-class="duration-200 ease-out" enter-from-class="opacity-0 -translate-y-2" enter-to-class="opacity-100 translate-y-0">
      <div v-if="hasLiveUpdate" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between gap-3">
        <p class="text-blue-700 text-sm flex items-center gap-2">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
          Hay actualizaciones nuevas en tus solicitudes
        </p>
        <button class="text-xs font-semibold text-blue-700 hover:text-blue-900 flex-shrink-0" @click="applyLiveUpdate">
          Actualizar ahora
        </button>
      </div>
    </Transition>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ServiceRequestsList
        :filtered="filtered"
        :filters="filters"
        :active-filter="activeFilter"
        :count-by-status="countByStatus"
        :loading="loading"
        :total="total"
        :view-as="viewAs"
        :is-normal="isNormal"
        :contact-avatar-url="contactAvatarUrl"
        :default-rate="defaultRate"
        :format-conversion="formatConversion"
        :format-date="formatDate"
        :format-date-time="formatDateTime"
        :format-price="formatPrice"
        :time-ago="timeAgo"
        @update:active-filter="activeFilter = $event"
        @open-detail="openDetail"
        @switch-view="switchView"
      />

      <ServiceRequestsSidebar
        :status-summary="statusSummary"
        :is-normal="isNormal"
        :view-as="viewAs"
        :pending-count="countByStatus('PENDING')"
      />
    </div>

    <!-- Modal de detalle -->
    <ServiceRequestDetailModal
      v-if="selectedReq"
      :show="!!selectedReq"
      :req="selectedReq"
      :is-provider="viewAs === 'provider'"
      @close="onModalClose"
      @updated="onRequestUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ClipboardDocumentListIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import ServiceRequestsList, { type ServiceRequest } from '~/components/service-requests/ServiceRequestsList.vue'
import ServiceRequestsSidebar from '~/components/service-requests/ServiceRequestsSidebar.vue'
import ServiceRequestDetailModal from '~/components/modals/ServiceRequestDetailModal.vue'
import { useApi } from '~/composables/core/useApi'
import { useExchangeRates } from '~/composables/wallets/useExchangeRates'
import { useNotifications, type Notification } from '~/composables/notifications/useNotifications'
import { useAssetUrl } from '~/composables/core/useAssetUrl'
import { useDateFormat } from '~/composables/core/useDateFormat'
import { useServiceRequestMessages } from '~/composables/services/useServiceRequestMessages'
import { useServiceRequestsUnreadBadge } from '~/composables/services/useServiceRequestsUnreadBadge'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { get, patch } = useApi()
const { defaultRate, formatConversion, fetchRates } = useExchangeRates()
const { getAssetUrl } = useAssetUrl()
const { formatDate: fmtDate, formatDateTime: fmtDateTime, timeAgo: fmtTimeAgo } = useDateFormat()

const isNormal = computed(() => user.value?.role === 'NORMAL')

function contactAvatarUrl(req: ServiceRequest): string | null {
  return getAssetUrl(viewAs.value === 'provider' ? req.clientAvatar : req.providerAvatar)
}

const filters = [
  { value: 'ALL',        label: 'Todas' },
  { value: 'PENDING',  label: 'Pendientes' },
  { value: 'SEEN',      label: 'Vistas' },
  { value: 'CONTACTED', label: 'Contactados' },
  { value: 'CLOSED',    label: 'Cerrados' },
  { value: 'CANCELLED',  label: 'Cancelados' },
  { value: 'REJECTED',  label: 'Rechazadas' },
]

const requests     = ref<ServiceRequest[]>([])
const total        = ref(0)
const loading      = ref(false)
const error        = ref<string | null>(null)
const activeFilter = ref('ALL')
const viewAs       = ref<'provider' | 'client'>(user.value?.role === 'NORMAL' ? 'client' : 'provider')
const selectedReq  = ref<ServiceRequest | null>(null)

const filtered = computed(() =>
  activeFilter.value === 'ALL'
    ? requests.value
    : requests.value.filter(r => r.status === activeFilter.value)
)

function countByStatus(status: string) {
  return requests.value.filter(r => r.status === status).length
}

const headerStats = computed(() => [
  { label: 'Total', value: String(total.value) },
  { label: 'Pendientes', value: String(countByStatus('PENDING')) },
  { label: 'Contactados', value: String(countByStatus('CONTACTED')) },
  { label: 'Cerrados', value: String(countByStatus('CLOSED')) },
])

const statusSummary = computed(() => [
  { status: 'PENDING',  label: 'Pendientes',  count: countByStatus('PENDING'),  dot: 'bg-yellow-400' },
  { status: 'SEEN',      label: 'Vistos',       count: countByStatus('SEEN'),      dot: 'bg-gray-400'   },
  { status: 'CONTACTED', label: 'Contactados',  count: countByStatus('CONTACTED'), dot: 'bg-blue-400'   },
  { status: 'CLOSED',    label: 'Cerrados',     count: countByStatus('CLOSED'),    dot: 'bg-green-400'  },
  { status: 'CANCELLED',  label: 'Cancelados',   count: countByStatus('CANCELLED'),  dot: 'bg-gray-300'   },
  { status: 'REJECTED',  label: 'Rechazados',   count: countByStatus('REJECTED'),  dot: 'bg-red-400'    },
])

async function openDetail(req: ServiceRequest) {
  selectedReq.value = req
  // Auto-marcar SEEN cuando el proveedor abre una solicitud PENDING
  if (viewAs.value === 'provider' && req.status === 'PENDING') {
    try {
      await patch(`/services/requests/${req.id}/status`, { status: 'SEEN' })
      const idx = requests.value.findIndex(r => r.id === req.id)
      if (idx !== -1) {
        requests.value[idx].status = 'SEEN'
        selectedReq.value = { ...requests.value[idx] }
      }
    } catch (e) {
      console.warn('[solicitudes] auto-mark SEEN failed:', e)
    }
  }
}

function onRequestUpdated(updated: ServiceRequest) {
  const idx = requests.value.findIndex(r => r.id === updated.id)
  if (idx !== -1) requests.value[idx] = updated
  selectedReq.value = updated
}

const { fetchUnreadCountByRequest } = useServiceRequestMessages()
const { refresh: refreshUnreadBadge } = useServiceRequestsUnreadBadge()

// Fetch separado del listado principal (no toca services.service.ts / backend
// de ServiceRequest) para mantener ese dominio desacoplado de mensajería —
// mismo criterio ya usado para avatares en el backend (withAvatars en batch).
async function refreshUnreadByRequest() {
  try {
    const counts = await fetchUnreadCountByRequest()
    for (const r of requests.value) {
      r.unreadCount = counts[r.id] ?? 0
    }
  } catch {
    // non-blocking
  }
}

async function fetchRequests() {
  loading.value = true
  error.value = null
  requests.value = []
  try {
    const res = await get<{ data: ServiceRequest[]; total: number }>(
      `/services/requests/mine?as=${viewAs.value}`,
    )
    requests.value = res.data
    total.value = res.total
  } catch (e: any) {
    error.value = e?.message ?? 'Error al cargar solicitudes'
  } finally {
    loading.value = false
  }
  refreshUnreadByRequest()
}

// El modal ya llama markRead() internamente al abrir el chat — reflejamos eso
// localmente (decremento, sin refetch) en vez de esperar al próximo fetch, y
// sincronizamos el badge global del sidebar.
function onModalClose() {
  if (selectedReq.value?.unreadCount) {
    const idx = requests.value.findIndex(r => r.id === selectedReq.value!.id)
    if (idx !== -1) requests.value[idx].unreadCount = 0
  }
  selectedReq.value = null
  refreshUnreadBadge()
}

// Abre el modal de una solicitud específica enlazada por id (ej. desde el
// widget del dashboard) — busca primero en la lista ya cargada (evita un
// fetch redundante), y si no está ahí (otra vista o filtro la oculta) la
// trae directo por id. Limpia el query param para que un refresh no la reabra.
async function openFromQuery() {
  const id = route.query.open
  if (typeof id !== 'string') return

  router.replace({ query: { ...route.query, open: undefined } })
  activeFilter.value = 'ALL'

  const existing = requests.value.find(r => r.id === id)
  if (existing && matchesCurrentView(existing)) {
    await openDetail(existing)
    return
  }

  try {
    const req = await get<ServiceRequest>(`/services/requests/${id}`)
    // El rol del usuario en ESTA solicitud puede no coincidir con la vista activa
    // (ej. un FREELANCER también pidió un servicio como cliente) — la sincronizamos
    // para que el modal muestre los datos correctos (contacto, próximas acciones, etc).
    const role: 'provider' | 'client' = req.providerId === user.value?.id ? 'provider' : 'client'
    if (role !== viewAs.value) {
      viewAs.value = role
      await fetchRequests()
    }
    await openDetail(req)
  } catch (e) {
    console.warn('[solicitudes] openFromQuery failed:', e)
    error.value = 'No se pudo abrir la solicitud enlazada.'
  }
}

function matchesCurrentView(req: ServiceRequest): boolean {
  return viewAs.value === 'provider'
    ? req.providerId === user.value?.id
    : req.requesterId === user.value?.id
}

function switchView(v: 'provider' | 'client') {
  if (viewAs.value === v) return
  viewAs.value = v
  activeFilter.value = 'ALL'
  selectedReq.value = null
  fetchRequests()
}

function formatDate(date: string) {
  return fmtDate(date)
}

function formatDateTime(date: string) {
  return fmtDateTime(date)
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 0 }).format(price)
}

function timeAgo(date: string) {
  return fmtTimeAgo(date)
}

// ─── Refresco en vivo vía notificaciones WebSocket ──────────────────────────
const { notifications } = useNotifications()
const hasLiveUpdate = ref(false)
let lastSeenNotificationCount = 0

watch(notifications, (list: Notification[]) => {
  if (list.length <= lastSeenNotificationCount) return
  const isRelevant = list
    .slice(0, list.length - lastSeenNotificationCount)
    .some((n) => n.link === '/service-requests' || n.link?.startsWith('/service-requests?'))
  lastSeenNotificationCount = list.length
  if (isRelevant) hasLiveUpdate.value = true
})

async function applyLiveUpdate() {
  hasLiveUpdate.value = false
  await fetchRequests()
}

onMounted(async () => {
  await fetchRequests()
  fetchRates(false, true)
  lastSeenNotificationCount = notifications.value.length
  await openFromQuery()
})
</script>
