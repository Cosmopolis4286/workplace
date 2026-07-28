<template>
  <div class="p-6 max-w-6xl mx-auto space-y-6">

    <PageHeader
      title="Solicitudes de Servicio (Admin)"
      description="Visibilidad de solo lectura sobre todas las solicitudes del marketplace, para auditoría y mediación de disputas."
      :icon="ClipboardDocumentListIcon"
      :breadcrumb="[{ label: 'Solicitudes de Servicio (Admin)' }]"
      :stats="headerStats"
    />

    <!-- Filtros -->
    <div class="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
      <select v-model="statusFilter" class="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-400" @change="reload">
        <option value="">Todos los estados</option>
        <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ SERVICE_REQUEST_STATUS_LABELS[s] }}</option>
      </select>
      <input
        v-model="fromFilter"
        type="date"
        class="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-400"
        @change="reload"
      />
      <input
        v-model="toFilter"
        type="date"
        class="text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-red-400"
        @change="reload"
      />
      <button class="text-xs font-semibold text-gray-500 hover:text-red-600" @click="clearFilters">Limpiar filtros</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="h-16 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <!-- Empty -->
    <div v-else-if="requests.length === 0" class="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <ClipboardDocumentListIcon class="h-10 w-10 text-gray-300 mx-auto mb-3" />
      <p class="text-sm text-gray-500">No hay solicitudes que coincidan con los filtros.</p>
    </div>

    <!-- Tabla -->
    <div v-else class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-gray-50 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Servicio</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Cliente</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Proveedor</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Estado</th>
              <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs uppercase tracking-wider">Creada</th>
              <th class="px-4 py-3 text-right font-semibold text-gray-500 text-xs uppercase tracking-wider">Detalle</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="req in requests" :key="req.id" class="hover:bg-gray-50">
              <td class="px-4 py-3 font-medium text-gray-900">{{ req.serviceName }}</td>
              <td class="px-4 py-3 text-gray-600">{{ req.clientName }}</td>
              <td class="px-4 py-3 text-gray-600">{{ req.providerName }}</td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                  :class="SERVICE_REQUEST_STATUS_CLASSES[req.status]"
                >
                  <component :is="SERVICE_REQUEST_STATUS_ICONS[req.status]" class="h-3 w-3" />
                  {{ SERVICE_REQUEST_STATUS_LABELS[req.status] }}
                </span>
              </td>
              <td class="px-4 py-3 text-gray-400">{{ formatDate(req.createdAt) }}</td>
              <td class="px-4 py-3 text-right">
                <button class="text-xs font-semibold text-red-600 hover:text-red-700" @click="openDetail(req.id)">Ver detalle</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span>{{ total }} solicitud{{ total !== 1 ? 'es' : '' }}</span>
        <div class="flex items-center gap-2">
          <button class="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50" :disabled="page <= 1" @click="page--; reload()">Anterior</button>
          <span>Página {{ page }} de {{ Math.max(totalPages, 1) }}</span>
          <button class="btn-secondary text-xs py-1.5 px-3 disabled:opacity-50" :disabled="page >= totalPages" @click="page++; reload()">Siguiente</button>
        </div>
      </div>
    </div>

    <!-- Detalle con historial -->
    <Teleport to="body">
      <div v-if="detail" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="detail = null" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6">
          <div class="flex items-start justify-between mb-4">
            <h2 class="text-lg font-bold text-gray-900">{{ detail.serviceName }}</h2>
            <button class="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100" @click="detail = null">
              <XMarkIcon class="h-4.5 w-4.5" />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3 text-sm mb-4">
            <div><p class="text-xs text-gray-400">Cliente</p><p class="font-medium text-gray-900">{{ detail.clientName }}</p></div>
            <div><p class="text-xs text-gray-400">Proveedor</p><p class="font-medium text-gray-900">{{ detail.providerName }}</p></div>
            <div><p class="text-xs text-gray-400">Estado actual</p><p class="font-medium text-gray-900">{{ SERVICE_REQUEST_STATUS_LABELS[detail.status] }}</p></div>
            <div v-if="detail.price != null"><p class="text-xs text-gray-400">Precio</p><p class="font-medium text-gray-900">${{ detail.price }}</p></div>
          </div>

          <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Historial de transiciones</p>
          <div v-if="!detail.statusHistory?.length" class="text-sm text-gray-400 italic">Sin transiciones registradas.</div>
          <ul v-else class="space-y-2">
            <li v-for="h in detail.statusHistory" :key="h.id" class="flex items-center justify-between text-sm border-b border-gray-50 pb-2">
              <span>
                <span class="text-gray-400">{{ h.previousStatus ? SERVICE_REQUEST_STATUS_LABELS[h.previousStatus] : 'Creación' }}</span>
                <span class="mx-1.5 text-gray-300">→</span>
                <span class="font-medium text-gray-900">{{ SERVICE_REQUEST_STATUS_LABELS[h.newStatus] }}</span>
              </span>
              <span class="text-xs text-gray-400">{{ formatDate(h.createdAt) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, computed, onMounted } from 'vue'
import { ClipboardDocumentListIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useApi } from '~/composables/useApi'
import {
  type ServiceRequestStatus,
  SERVICE_REQUEST_STATUS_LABELS,
  SERVICE_REQUEST_STATUS_CLASSES,
  SERVICE_REQUEST_STATUS_ICONS,
} from '~/config/serviceRequestStatus.config'

// El guard de rol (SUPERADMIN/ADMIN) vive en middleware/auth.ts (ADMIN_ONLY_ROUTES)
const { get } = useApi()

interface ServiceRequestRow {
  id: string
  serviceName: string
  clientName: string
  providerName: string
  status: ServiceRequestStatus
  createdAt: string
  price?: number | null
}

interface StatusHistoryEntry {
  id: string
  previousStatus: ServiceRequestStatus | null
  newStatus: ServiceRequestStatus
  changedBy: string | null
  createdAt: string
}

interface ServiceRequestDetail extends ServiceRequestRow {
  statusHistory: StatusHistoryEntry[]
}

const STATUS_OPTIONS: ServiceRequestStatus[] = ['PENDING', 'SEEN', 'CONTACTED', 'CLOSED', 'CANCELLED', 'REJECTED']

const requests = ref<ServiceRequestRow[]>([])
const total = ref(0)
const totalPages = ref(1)
const page = ref(1)
const loading = ref(true)
const statusFilter = ref('')
const fromFilter = ref('')
const toFilter = ref('')
const detail = ref<ServiceRequestDetail | null>(null)

const headerStats = computed(() => [
  { label: 'Total', value: String(total.value) },
])

async function reload() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (statusFilter.value) params.set('status', statusFilter.value)
    if (fromFilter.value) params.set('from', fromFilter.value)
    if (toFilter.value) params.set('to', toFilter.value)
    params.set('page', String(page.value))
    params.set('limit', '20')

    const res = await get<{ data: ServiceRequestRow[]; total: number; totalPages: number }>(
      `/services/requests/admin?${params.toString()}`
    )
    requests.value = res.data
    total.value = res.total
    totalPages.value = res.totalPages
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  statusFilter.value = ''
  fromFilter.value = ''
  toFilter.value = ''
  page.value = 1
  reload()
}

async function openDetail(id: string) {
  detail.value = await get<ServiceRequestDetail>(`/services/requests/admin/${id}`)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(reload)
</script>
