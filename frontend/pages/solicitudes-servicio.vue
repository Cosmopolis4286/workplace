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
        <!-- Toggle recibidas / enviadas -->
        <div class="flex items-center bg-white border border-gray-200 rounded-xl p-1 gap-1 shadow-sm">
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
              class="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors group"
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
                <p class="text-xs text-gray-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>{{ MODALITY_LABELS[req.modality] ?? req.modality }}</span>
                  <span>{{ formatDate(req.preferredDate) }}</span>
                  <span v-if="req.address">{{ req.address }}{{ req.city ? `, ${req.city}` : '' }}</span>
                  <span v-if="viewAs === 'provider' && req.clientPhone">{{ req.clientPhone }}</span>
                </p>
                <p v-if="req.description" class="text-xs text-gray-500 mt-1.5 line-clamp-1 italic">"{{ req.description }}"</p>
              </div>

              <!-- Badge estado + precio -->
              <div class="flex-shrink-0 text-right space-y-1.5">
                <span class="badge block text-center" :class="STATUS_CLASSES[req.status]">
                  {{ STATUS_LABELS[req.status] }}
                </span>
                <p v-if="req.price" class="text-sm font-bold text-gray-900">
                  ${{ formatPrice(req.price) }}
                  <span v-if="req.priceUnit" class="text-xs font-normal text-gray-400">/ {{ req.priceUnit }}</span>
                </p>
              </div>

              <!-- Acciones hover (solo proveedor) -->
              <div
                v-if="viewAs === 'provider'"
                class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <button
                  v-for="action in nextActions(req.status)"
                  :key="action.status"
                  :disabled="updating === req.id"
                  class="p-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                  :class="action.class"
                  :title="action.label"
                  @click="updateStatus(req.id, action.status)"
                >
                  <component :is="action.icon" class="h-4 w-4" />
                </button>
              </div>
            </div>
          </template>
        </div>

        <!-- Tiempo -->
        <p v-if="!loading && filtered.length > 0" class="text-xs text-gray-400 text-right px-1">
          {{ total }} solicitud{{ total !== 1 ? 'es' : '' }} en total
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

        <!-- Detalle de la última seleccionada (si hay filtro activo) -->
        <div v-if="viewAs === 'provider' && countByStatus('PENDIENTE') > 0" class="card p-5 border-l-4 border-l-yellow-400">
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

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  ClipboardDocumentListIcon,
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  PhoneIcon,
  InformationCircleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useApi } from '~/composables/useApi'

definePageMeta({ middleware: 'auth' })

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string
const { getHeaders } = useAuth()

interface ServiceRequest {
  id: string
  serviceName: string
  providerName: string
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
  status: 'PENDIENTE' | 'VISTO' | 'CONTACTADO' | 'CERRADO'
  createdAt: string
}

const STATUS_LABELS: Record<ServiceRequest['status'], string> = {
  PENDIENTE:  'Pendiente',
  VISTO:      'Visto',
  CONTACTADO: 'Contactado',
  CERRADO:    'Cerrado',
}

const STATUS_CLASSES: Record<ServiceRequest['status'], string> = {
  PENDIENTE:  'bg-yellow-100 text-yellow-800',
  VISTO:      'bg-gray-100 text-gray-600',
  CONTACTADO: 'bg-blue-100 text-blue-700',
  CERRADO:    'bg-green-100 text-green-700',
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
]

const requests  = ref<ServiceRequest[]>([])
const total     = ref(0)
const loading   = ref(false)
const error     = ref<string | null>(null)
const updating  = ref<string | null>(null)
const activeFilter = ref('ALL')
const viewAs    = ref<'provider' | 'client'>('provider')

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
])

function nextActions(status: ServiceRequest['status']) {
  if (status === 'PENDIENTE') return [
    { status: 'CONTACTADO', label: 'Marcar contactado', icon: PhoneIcon,       class: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
    { status: 'CERRADO',    label: 'Cerrar',             icon: CheckCircleIcon, class: 'bg-gray-100 text-gray-500 hover:bg-gray-200' },
  ]
  if (status === 'VISTO') return [
    { status: 'CONTACTADO', label: 'Marcar contactado', icon: PhoneIcon,       class: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
  ]
  if (status === 'CONTACTADO') return [
    { status: 'CERRADO', label: 'Cerrar trato', icon: CheckCircleIcon, class: 'bg-green-50 text-green-600 hover:bg-green-100' },
  ]
  return []
}

async function fetchRequests() {
  loading.value = true
  error.value = null
  requests.value = []
  try {
    const res = await $fetch<{ data: ServiceRequest[]; total: number }>(
      `${apiUrl}/services/requests/mine?as=${viewAs.value}`,
      { headers: getHeaders() }
    )
    requests.value = res.data
    total.value = res.total
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error al cargar solicitudes'
  } finally {
    loading.value = false
  }
}

function switchView(v: 'provider' | 'client') {
  if (viewAs.value === v) return
  viewAs.value = v
  activeFilter.value = 'ALL'
  fetchRequests()
}

async function updateStatus(id: string, status: string) {
  updating.value = id
  try {
    const { patch } = useApi()
    await patch(`/services/requests/${id}/status`, { status })
    const idx = requests.value.findIndex(r => r.id === id)
    if (idx !== -1) requests.value[idx].status = status as ServiceRequest['status']
  } catch (e: any) {
    error.value = e?.data?.message ?? 'Error al actualizar estado'
  } finally {
    updating.value = null
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(price)
}

onMounted(fetchRequests)
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
