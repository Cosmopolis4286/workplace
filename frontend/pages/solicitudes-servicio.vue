<template>
  <div class="min-h-screen bg-gray-50 p-4 sm:p-6">
    <div class="max-w-4xl mx-auto">

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-black text-gray-900">Solicitudes de Servicio</h1>
        <p class="text-sm text-gray-500 mt-0.5">Clientes interesados en tus servicios</p>
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
          <p class="text-xs text-gray-500 mb-1">Contactados</p>
          <p class="text-2xl font-black text-blue-600">{{ countByStatus('CONTACTADO') }}</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p class="text-xs text-gray-500 mb-1">Cerrados</p>
          <p class="text-2xl font-black text-green-600">{{ countByStatus('CERRADO') }}</p>
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
          <span v-if="f.value !== 'ALL'" class="ml-1 opacity-70">({{ countByStatus(f.value) }})</span>
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
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
          </svg>
        </div>
        <p class="text-sm font-bold text-gray-700 mb-1">Sin solicitudes</p>
        <p class="text-xs text-gray-400">Aún no has recibido solicitudes en esta categoría</p>
      </div>

      <!-- Lista -->
      <div v-else class="space-y-3">
        <div
          v-for="req in filtered"
          :key="req.id"
          class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <div class="flex items-start gap-4">
            <!-- Avatar inicial -->
            <div class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-700 font-black text-sm">
              {{ req.clientName[0].toUpperCase() }}
            </div>

            <div class="flex-1 min-w-0">
              <!-- Fila superior -->
              <div class="flex items-start justify-between gap-2 mb-1">
                <div>
                  <p class="text-sm font-bold text-gray-900">{{ req.clientName }}</p>
                  <p class="text-xs text-blue-600 font-semibold truncate">{{ req.serviceName }}</p>
                </div>
                <span class="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full" :class="statusClass(req.status)">
                  {{ STATUS_LABELS[req.status] }}
                </span>
              </div>

              <!-- Detalles -->
              <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.948V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                  </svg>
                  {{ req.clientPhone }}
                </span>
                <span v-if="req.clientEmail" class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  {{ req.clientEmail }}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                  {{ formatDate(req.preferredDate) }}
                </span>
                <span class="flex items-center gap-1">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                  </svg>
                  {{ MODALITY_LABELS[req.modality] }}
                </span>
              </div>

              <!-- Descripción -->
              <p v-if="req.description" class="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2 mb-3 line-clamp-2">
                "{{ req.description }}"
              </p>

              <!-- Precio + Acciones -->
              <div class="flex items-center justify-between">
                <span v-if="req.price" class="text-sm font-black text-blue-600">
                  ${{ formatPrice(req.price) }}<span v-if="req.priceUnit" class="text-xs font-normal text-gray-400 ml-1">/ {{ req.priceUnit }}</span>
                </span>
                <span v-else class="text-xs text-gray-400">Sin precio indicado</span>

                <div class="flex gap-2">
                  <button
                    v-for="action in nextActions(req.status)"
                    :key="action.status"
                    :disabled="updating === req.id"
                    class="px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    :class="action.class"
                    @click="updateStatus(req.id, action.status)"
                  >
                    {{ action.label }}
                  </button>
                </div>
              </div>

              <p class="text-[10px] text-gray-400 mt-2">Recibida {{ timeAgo(req.createdAt) }}</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useApi } from '~/composables/useApi'

const config = useRuntimeConfig()
const apiUrl = config.public.apiUrl as string
const { getHeaders } = useAuth()

interface ServiceRequest {
  id: string
  serviceName: string
  modality: 'PRESENCIAL' | 'REMOTO' | 'CUALQUIERA'
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

const MODALITY_LABELS: Record<ServiceRequest['modality'], string> = {
  PRESENCIAL: 'Presencial',
  REMOTO:     'Remoto',
  CUALQUIERA: 'Cualquiera',
}

const filters = [
  { value: 'ALL',        label: 'Todas' },
  { value: 'PENDIENTE',  label: 'Pendientes' },
  { value: 'VISTO',      label: 'Vistas' },
  { value: 'CONTACTADO', label: 'Contactados' },
  { value: 'CERRADO',    label: 'Cerrados' },
]

const requests = ref<ServiceRequest[]>([])
const total = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const updating = ref<string | null>(null)
const activeFilter = ref('ALL')

const filtered = computed(() =>
  activeFilter.value === 'ALL'
    ? requests.value
    : requests.value.filter(r => r.status === activeFilter.value)
)

function countByStatus(status: string) {
  return requests.value.filter(r => r.status === status).length
}

function statusClass(status: ServiceRequest['status']) {
  return STATUS_CLASSES[status]
}

function nextActions(status: ServiceRequest['status']) {
  if (status === 'PENDIENTE') return [
    { status: 'CONTACTADO', label: 'Marcar contactado', class: 'bg-blue-600 text-white hover:bg-blue-700' },
    { status: 'CERRADO',    label: 'Cerrar',            class: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  ]
  if (status === 'VISTO') return [
    { status: 'CONTACTADO', label: 'Marcar contactado', class: 'bg-blue-600 text-white hover:bg-blue-700' },
  ]
  if (status === 'CONTACTADO') return [
    { status: 'CERRADO', label: 'Cerrar', class: 'bg-green-600 text-white hover:bg-green-700' },
  ]
  return []
}

async function fetchRequests() {
  loading.value = true
  error.value = null
  try {
    const res = await $fetch<{ data: ServiceRequest[]; total: number }>(
      `${apiUrl}/services/requests/mine`,
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

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)} días`
}

onMounted(fetchRequests)
</script>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
