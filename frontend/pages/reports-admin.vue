<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">

    <PageHeader
      title="Reportes de Usuarios"
      description="Revisa y resuelve los problemas reportados por clientes y proveedores."
      :icon="FlagIcon"
      :breadcrumb="[{ label: 'Reportes' }]"
      :stats="headerStats"
    />

    <div class="flex flex-wrap gap-2">
      <button
        v-for="opt in STATUS_FILTERS"
        :key="opt.value ?? 'all'"
        type="button"
        class="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
        :class="statusFilter === opt.value ? 'bg-workplace-red text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        @click="setFilter(opt.value)"
      >
        {{ opt.label }}
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <div v-else-if="items.length === 0" class="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <CheckCircleIcon class="h-10 w-10 text-green-400 mx-auto mb-3" />
      <p class="text-sm text-gray-500">No hay reportes {{ statusFilter ? STATUS_LABELS[statusFilter].toLowerCase() : '' }}.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div class="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
          <div>
            <p class="text-sm font-bold text-gray-900">{{ item.reporter?.firstName }} {{ item.reporter?.lastName }}</p>
            <p class="text-xs text-gray-400">{{ item.reporter?.email }} · {{ ENTITY_LABELS[item.entityType] }}</p>
          </div>
          <span class="badge" :class="STATUS_CLASSES[item.status]">{{ STATUS_LABELS[item.status] }}</span>
        </div>

        <div class="px-6 py-4 space-y-2">
          <p class="text-sm font-semibold text-gray-900">{{ item.reason }}</p>
          <p v-if="item.description" class="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{{ item.description }}</p>
          <p v-if="item.entityId" class="text-xs text-gray-400 font-mono">ID: {{ item.entityId }}</p>
          <p v-if="item.adminNotes" class="text-xs text-gray-500 italic">Notas previas: {{ item.adminNotes }}</p>
        </div>

        <div v-if="item.status === 'PENDING' || item.status === 'IN_REVIEW'" class="px-6 pb-4">
          <textarea
            v-model="notesDraft[item.id]"
            rows="2"
            placeholder="Notas internas (opcional)"
            class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 resize-none"
          />
        </div>

        <div v-if="item.status === 'PENDING' || item.status === 'IN_REVIEW'" class="px-6 py-4 bg-gray-50 flex flex-wrap items-center justify-end gap-3">
          <button
            v-if="item.status === 'PENDING'"
            class="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-white"
            :disabled="processingId === item.id"
            @click="setStatus(item.id, 'IN_REVIEW')"
          >
            Marcar en revisión
          </button>
          <button
            class="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-white"
            :disabled="processingId === item.id"
            @click="setStatus(item.id, 'DISMISSED')"
          >
            Descartar
          </button>
          <button
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-60"
            :disabled="processingId === item.id"
            @click="setStatus(item.id, 'RESOLVED')"
          >
            {{ processingId === item.id ? 'Procesando…' : 'Marcar resuelto' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, reactive, computed, onMounted } from 'vue'
import { CheckCircleIcon, FlagIcon } from '@heroicons/vue/24/outline'
import { useReports, type Report, type ReportStatus, type ReportEntityType } from '~/composables/useReports'
import PageHeader from '~/components/ui/PageHeader.vue'

// El guard vive en middleware/auth.ts vía permiso reviews:moderate (ver
// PermissionsGuard en el backend) — esta página no necesita chequeo propio.
const { fetchAllReports, moderateReport } = useReports()

const items = ref<Report[]>([])
const loading = ref(true)
const processingId = ref<string | null>(null)
const statusFilter = ref<ReportStatus | undefined>('PENDING')
const notesDraft = reactive<Record<string, string>>({})

const STATUS_FILTERS: { label: string; value: ReportStatus | undefined }[] = [
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'En revisión', value: 'IN_REVIEW' },
  { label: 'Resueltos', value: 'RESOLVED' },
  { label: 'Descartados', value: 'DISMISSED' },
  { label: 'Todos', value: undefined },
]

const STATUS_LABELS: Record<ReportStatus, string> = {
  PENDING: 'Pendiente', IN_REVIEW: 'En revisión', RESOLVED: 'Resuelto', DISMISSED: 'Descartado',
}
const STATUS_CLASSES: Record<ReportStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  DISMISSED: 'bg-gray-100 text-gray-600',
}
const ENTITY_LABELS: Record<ReportEntityType, string> = {
  CATALOG_ORDER: 'Pedido de catálogo', SERVICE_REQUEST: 'Solicitud de servicio', ORDER: 'Pedido', GENERAL: 'General',
}

const headerStats = computed(() => [
  { label: STATUS_FILTERS.find(f => f.value === statusFilter.value)?.label ?? 'Total', value: items.value.length },
])

async function load() {
  loading.value = true
  try {
    items.value = await fetchAllReports(statusFilter.value)
  } finally {
    loading.value = false
  }
}

function setFilter(status: ReportStatus | undefined) {
  statusFilter.value = status
  load()
}

async function setStatus(id: string, status: ReportStatus) {
  processingId.value = id
  try {
    await moderateReport(id, status, notesDraft[id]?.trim() || undefined)
    items.value = items.value.filter(i => i.id !== id)
  } finally {
    processingId.value = null
  }
}

onMounted(load)
</script>
