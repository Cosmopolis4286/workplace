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
        <!-- Toggle recibidas / enviadas — solo para FREELANCER y COMMERCE (proveedores) -->
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
              v-if="f.value !== 'ALL' && countByStatus(f.value) > 0"
              class="ml-1.5 text-xs px-1.5 py-0.5 rounded-full"
              :class="activeFilter === f.value ? 'bg-red-500/30 text-red-100' : 'bg-gray-100 text-gray-500'"
            >
              {{ countByStatus(f.value) }}
            </span>
          </button>
        </div>

        <!-- Card con la lista -->
        <div class="card divide-y divide-gray-100">

          <!-- Skeleton -->
          <template v-if="loading">
            <div v-for="n in 4" :key="n" class="p-4 flex items-center gap-4">
              <div class="skeleton h-10 w-10 rounded-full flex-shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="skeleton h-4 w-40 rounded" />
                <div class="skeleton h-3 w-56 rounded" />
              </div>
              <div class="skeleton h-6 w-20 rounded" />
            </div>
          </template>

          <!-- Empty state -->
          <div v-else-if="filtered.length === 0" class="p-12 text-center">
            <ClipboardDocumentListIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p class="text-gray-500 font-medium">
              {{ viewAs === 'provider' ? 'No hay solicitudes recibidas' : 'No has enviado solicitudes' }}
            </p>
            <p class="text-sm text-gray-400 mt-1">
              {{ viewAs === 'provider'
                ? 'Cuando alguien contacte tus servicios, aparecerá aquí.'
                : 'Explora el catálogo y solicita servicios de otros proveedores.' }}
            </p>
          </div>

          <!-- Filas -->
          <template v-else>
            <div
              v-for="req in filtered"
              :key="req.id"
              class="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors group cursor-pointer"
              @click="openDetail(req)"
            >
              <!-- Avatar -->
              <div
                class="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                :class="viewAs === 'provider' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ (viewAs === 'provider' ? req.clientName : req.providerName)[0].toUpperCase() }}
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="font-semibold text-gray-900 text-sm">
                    {{ viewAs === 'provider' ? req.clientName : req.providerName }}
                  </p>
                  <span class="text-gray-300">·</span>
                  <p class="text-sm text-red-600 font-medium truncate">{{ req.serviceName }}</p>
                </div>
                <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span>{{ MODALITY_LABELS[req.modality] ?? req.modality }}</span>
                  <span class="flex items-center gap-1">
                    <CalendarIcon class="h-3 w-3" />
                    {{ formatDate(req.preferredDate) }}
                  </span>
                  <span v-if="req.address" class="flex items-center gap-1">
                    <MapPinIcon class="h-3 w-3" />
                    {{ req.address }}{{ req.city ? `, ${req.city}` : '' }}
                  </span>
                  <span v-if="viewAs === 'provider' && req.clientPhone" class="flex items-center gap-1">
                    <PhoneIcon class="h-3 w-3" />
                    {{ req.clientPhone }}
                  </span>
                </p>
                <p v-if="req.description" class="text-xs text-gray-500 mt-1.5 line-clamp-1 italic">"{{ req.description }}"</p>
                <!-- Indicador de nota del proveedor -->
                <div v-if="req.providerNotes" class="flex items-center gap-1 mt-1.5">
                  <DocumentTextIcon class="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <span class="text-xs text-gray-400 line-clamp-1 italic">{{ req.providerNotes }}</span>
                </div>
                <!-- Tiempo relativo de la solicitud -->
                <p class="text-[11px] text-gray-300 mt-1.5 flex items-center gap-1" :title="formatDateTime(req.createdAt)">
                  <ClockIcon class="h-3 w-3" />
                  {{ timeAgo(req.createdAt) }}
                </p>
              </div>

              <!-- Badge estado + precio -->
              <div class="flex-shrink-0 text-right space-y-1.5">
                <span class="inline-flex items-center gap-1 justify-center px-2.5 py-1 rounded-full text-xs font-semibold" :class="STATUS_CLASSES[req.status]">
                  <component :is="STATUS_ICONS[req.status]" class="h-3 w-3" />
                  {{ STATUS_LABELS[req.status] }}
                </span>
                <div v-if="req.price">
                  <p class="text-sm font-bold text-gray-900">
                    ${{ formatPrice(req.price) }}
                    <span v-if="req.priceUnit" class="text-xs font-normal text-gray-400">/ {{ req.priceUnit }}</span>
                  </p>
                  <p v-if="defaultRate" class="text-xs font-medium text-gray-400">
                    {{ formatConversion(req.price, defaultRate) }}{{ req.priceUnit ? ` / ${req.priceUnit}` : '' }}
                  </p>
                </div>
              </div>

              <!-- Flecha de detalle -->
              <div class="flex-shrink-0 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRightIcon class="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </template>
        </div>

        <!-- Total -->
        <p v-if="!loading && filtered.length > 0" class="text-xs text-gray-400 text-right px-1">
          {{ total }} solicitud{{ total !== 1 ? 'es' : '' }} en total · Haz clic para ver detalles
        </p>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">

        <!-- Resumen por estado -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-4">Resumen</h3>
          <div class="space-y-3">
            <div v-for="s in statusSummary" :key="s.status" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full flex-shrink-0" :class="s.dot" />
                <span class="text-sm text-gray-600">{{ s.label }}</span>
              </div>
              <span class="text-sm font-bold text-gray-900">{{ s.count }}</span>
            </div>
          </div>
        </div>

        <!-- Pendientes sin atender — solo para proveedores -->
        <div v-if="!isNormal && viewAs === 'provider' && countByStatus('PENDIENTE') > 0" class="card p-5 border-l-4 border-l-yellow-400">
          <div class="flex items-center gap-2 mb-1">
            <ClockIcon class="h-4 w-4 text-yellow-500" />
            <p class="text-sm font-semibold text-gray-700">Pendientes sin atender</p>
          </div>
          <p class="text-2xl font-black text-yellow-600">{{ countByStatus('PENDIENTE') }}</p>
          <p class="text-xs text-gray-400 mt-1">Responde pronto para mejorar tu conversión</p>
        </div>

        <!-- Info vista cliente -->
        <div v-if="viewAs === 'client'" class="card p-5 border-l-4 border-l-blue-400">
          <div class="flex items-center gap-2 mb-1">
            <InformationCircleIcon class="h-4 w-4 text-blue-500" />
            <p class="text-sm font-semibold text-gray-700">Solicitudes enviadas</p>
          </div>
          <p class="text-xs text-gray-500 mt-1">
            El proveedor se pondrá en contacto contigo para coordinar los detalles del servicio.
          </p>
        </div>

        <!-- Tip proveedor -->
        <div v-if="viewAs === 'provider'" class="card p-5 bg-gradient-to-br from-red-50 to-orange-50 border border-red-100">
          <p class="text-xs font-semibold text-red-700 mb-2">Flujo recomendado</p>
          <ol class="space-y-1.5">
            <li class="flex items-start gap-2 text-xs text-gray-600">
              <span class="font-bold text-red-500 flex-shrink-0">1.</span>
              Haz clic en la solicitud para ver los datos del cliente
            </li>
            <li class="flex items-start gap-2 text-xs text-gray-600">
              <span class="font-bold text-red-500 flex-shrink-0">2.</span>
              Contacta al cliente y marca como "Contactado"
            </li>
            <li class="flex items-start gap-2 text-xs text-gray-600">
              <span class="font-bold text-red-500 flex-shrink-0">3.</span>
              Agrega observaciones del acuerdo (fecha, precio, detalles)
            </li>
            <li class="flex items-start gap-2 text-xs text-gray-600">
              <span class="font-bold text-red-500 flex-shrink-0">4.</span>
              Cierra el trato cuando se complete el servicio
            </li>
          </ol>
        </div>

      </div>
    </div>

    <!-- Modal de detalle -->
    <ServiceRequestDetailModal
      v-if="selectedReq"
      :show="!!selectedReq"
      :req="selectedReq"
      :is-provider="viewAs === 'provider'"
      @close="selectedReq = null"
      @updated="onRequestUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ClipboardDocumentListIcon,
  XMarkIcon,
  ClockIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  CalendarIcon,
  MapPinIcon,
  PhoneIcon,
  EyeIcon,
  PhoneArrowUpRightIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import ServiceRequestDetailModal from '~/components/modals/ServiceRequestDetailModal.vue'
import { useApi } from '~/composables/useApi'
import { useExchangeRates } from '~/composables/useExchangeRates'
import { useNotifications, type Notification } from '~/composables/useNotifications'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const { user } = useAuth()
const { get, patch } = useApi()
const { defaultRate, formatConversion, fetchRates } = useExchangeRates()

const isNormal = computed(() => user.value?.role === 'NORMAL')

interface ServiceRequestItem {
  id: string
  fields: Record<string, string>
  notes?: string
  photos: string[]
  videos: string[]
}

interface ServiceRequest {
  id: string
  serviceName: string
  providerId?: string
  providerName: string
  requesterId?: string | null
  modality: string
  preferredDate: string
  address?: string
  city?: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  description?: string
  price?: number
  priceUnit?: string
  providerNotes?: string
  status: 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO' | 'CANCELADO'
  createdAt: string
  statusUpdatedAt?: string
  items?: ServiceRequestItem[]
}

const STATUS_LABELS: Record<ServiceRequest['status'], string> = {
  PENDIENTE:  'Pendiente',
  VISTO:      'Visto',
  CONTACTADO: 'Contactado',
  CERRADO:    'Cerrado',
  CANCELADO:  'Cancelado',
}

const STATUS_CLASSES: Record<ServiceRequest['status'], string> = {
  PENDIENTE:  'bg-yellow-100 text-yellow-800',
  VISTO:      'bg-gray-100 text-gray-600',
  CONTACTADO: 'bg-blue-100 text-blue-700',
  CERRADO:    'bg-green-100 text-green-700',
  CANCELADO:  'bg-gray-100 text-gray-500',
}

const STATUS_ICONS: Record<ServiceRequest['status'], any> = {
  PENDIENTE:  ClockIcon,
  VISTO:      EyeIcon,
  CONTACTADO: PhoneArrowUpRightIcon,
  CERRADO:    CheckCircleIcon,
  CANCELADO:  XCircleIcon,
}

const MODALITY_LABELS: Record<string, string> = {
  PRESENCIAL: '📍 Presencial',
  REMOTO:     '💻 Remoto',
  CUALQUIERA: '🤝 Cualquiera',
}

const filters = [
  { value: 'ALL',        label: 'Todas' },
  { value: 'PENDIENTE',  label: 'Pendientes' },
  { value: 'VISTO',      label: 'Vistas' },
  { value: 'CONTACTADO', label: 'Contactados' },
  { value: 'CERRADO',    label: 'Cerrados' },
  { value: 'CANCELADO',  label: 'Cancelados' },
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
  { label: 'Pendientes', value: String(countByStatus('PENDIENTE')) },
  { label: 'Contactados', value: String(countByStatus('CONTACTADO')) },
  { label: 'Cerrados', value: String(countByStatus('CERRADO')) },
])

const statusSummary = computed(() => [
  { status: 'PENDIENTE',  label: 'Pendientes',  count: countByStatus('PENDIENTE'),  dot: 'bg-yellow-400' },
  { status: 'VISTO',      label: 'Vistos',       count: countByStatus('VISTO'),      dot: 'bg-gray-400'   },
  { status: 'CONTACTADO', label: 'Contactados',  count: countByStatus('CONTACTADO'), dot: 'bg-blue-400'   },
  { status: 'CERRADO',    label: 'Cerrados',     count: countByStatus('CERRADO'),    dot: 'bg-green-400'  },
  { status: 'CANCELADO',  label: 'Cancelados',   count: countByStatus('CANCELADO'),  dot: 'bg-gray-300'   },
])

async function openDetail(req: ServiceRequest) {
  selectedReq.value = req
  // Auto-marcar VISTO cuando el proveedor abre una solicitud PENDIENTE
  if (viewAs.value === 'provider' && req.status === 'PENDIENTE') {
    try {
      await patch(`/services/requests/${req.id}/status`, { status: 'VISTO' })
      const idx = requests.value.findIndex(r => r.id === req.id)
      if (idx !== -1) {
        requests.value[idx].status = 'VISTO'
        selectedReq.value = { ...requests.value[idx] }
      }
    } catch { /* silently ignore */ }
  }
}

function onRequestUpdated(updated: ServiceRequest) {
  const idx = requests.value.findIndex(r => r.id === updated.id)
  if (idx !== -1) requests.value[idx] = updated
  selectedReq.value = updated
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
  } catch { /* silently ignore: solicitud no encontrada o sin permiso */ }
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
  return new Date(date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 10)    return 'hace un momento'
  if (sec < 60)    return `hace ${sec} segundo${sec !== 1 ? 's' : ''}`
  const min = Math.floor(sec / 60)
  if (min < 60)    return `hace ${min} minuto${min !== 1 ? 's' : ''}`
  const hrs = Math.floor(min / 60)
  if (hrs < 24)    return `hace ${hrs} hora${hrs !== 1 ? 's' : ''}`
  const days = Math.floor(hrs / 24)
  if (days < 7)    return `hace ${days} día${days !== 1 ? 's' : ''}`
  const weeks = Math.floor(days / 7)
  if (weeks < 4)   return `hace ${weeks} semana${weeks !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `hace ${months} mes${months !== 1 ? 'es' : ''}`
  const years = Math.floor(days / 365)
  return `hace ${years} año${years !== 1 ? 's' : ''}`
}

// ─── Refresco en vivo vía notificaciones WebSocket ──────────────────────────
const { notifications } = useNotifications()
const hasLiveUpdate = ref(false)
let lastSeenNotificationCount = 0

watch(notifications, (list: Notification[]) => {
  if (list.length <= lastSeenNotificationCount) return
  const isRelevant = list
    .slice(0, list.length - lastSeenNotificationCount)
    .some((n) => n.link === '/solicitudes-servicio')
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

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
