<template>
  <div class="bg-white rounded-2xl border border-gray-200 shadow-sm">
    <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
      <h2 class="font-bold text-gray-900">Reportes de usuarios</h2>
      <div class="flex items-center gap-2">
        <select v-model="statusFilter" class="text-xs border border-gray-200 rounded-lg px-2 py-1.5" @change="load">
          <option value="">Todos</option>
          <option value="PENDING">Pendientes</option>
          <option value="IN_REVIEW">En revisión</option>
          <option value="RESOLVED">Resueltos</option>
          <option value="DISMISSED">Descartados</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="px-6 py-10 text-center text-sm text-gray-400">Cargando…</div>

    <div v-else class="divide-y divide-gray-50">
      <div v-for="r in userReports" :key="r.id" class="px-6 py-4 space-y-2">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-gray-700">
            <span class="font-bold">{{ r.reporter.firstName }} {{ r.reporter.lastName }}</span>
            reportó
            <span class="font-semibold">{{ ENTITY_TYPE_LABELS[r.entityType] }}</span>
          </p>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full" :class="REPORT_STATUS_CLASSES[r.status]">
            {{ REPORT_STATUS_LABELS[r.status] }}
          </span>
        </div>
        <p class="text-sm text-gray-900 font-medium">{{ r.reason }}</p>
        <p v-if="r.description" class="text-sm text-gray-500 italic">"{{ r.description }}"</p>
        <p v-if="r.adminNotes" class="text-xs text-gray-400">Nota interna: {{ r.adminNotes }}</p>

        <div v-if="r.status === 'PENDING' || r.status === 'IN_REVIEW'" class="flex gap-2 pt-1">
          <button
            v-if="r.status === 'PENDING'"
            @click="moderate(r.id, 'IN_REVIEW')"
            class="text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Marcar en revisión
          </button>
          <button
            @click="moderate(r.id, 'RESOLVED')"
            class="text-xs font-semibold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700"
          >
            Marcar resuelto
          </button>
          <button
            @click="moderate(r.id, 'DISMISSED')"
            class="text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Descartar
          </button>
        </div>
      </div>

      <div v-if="userReports.length === 0 && !loading" class="px-6 py-10 text-center text-sm text-gray-400">
        No hay reportes de usuarios.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

interface UserReport {
  id: string
  entityType: 'CATALOG_ORDER' | 'SERVICE_REQUEST' | 'ORDER' | 'GENERAL'
  reason: string
  description?: string
  status: 'PENDING' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED'
  adminNotes?: string
  reporter: { firstName: string; lastName: string }
  createdAt: string
}

const emit = defineEmits<{
  error: [message: string | null]
  count: [count: number]
}>()

const ENTITY_TYPE_LABELS: Record<UserReport['entityType'], string> = {
  CATALOG_ORDER: 'un pedido de catálogo',
  SERVICE_REQUEST: 'una solicitud de servicio',
  ORDER: 'un pedido de comida',
  GENERAL: 'un problema general de la app',
}

const REPORT_STATUS_LABELS: Record<UserReport['status'], string> = {
  PENDING: 'Pendiente',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelto',
  DISMISSED: 'Descartado',
}

const REPORT_STATUS_CLASSES: Record<UserReport['status'], string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  IN_REVIEW: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-green-50 text-green-700',
  DISMISSED: 'bg-gray-100 text-gray-400',
}

const userReports = ref<UserReport[]>([])
const loading = ref(false)
const statusFilter = ref('')

async function load() {
  loading.value = true
  try {
    const query = statusFilter.value ? `?status=${statusFilter.value}` : ''
    const { get } = useApi()
    userReports.value = await get<UserReport[]>(`/reports/admin${query}`)
    emit('count', userReports.value.length)
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al cargar los reportes de usuarios'))
  } finally {
    loading.value = false
  }
}

async function moderate(id: string, status: UserReport['status']) {
  emit('error', null)
  try {
    const { patch } = useApi()
    await patch(`/reports/admin/${id}`, { status })
    await load()
  } catch (e: any) {
    emit('error', getApiErrorMessage(e, 'Error al actualizar el reporte'))
  }
}

onMounted(load)
</script>
