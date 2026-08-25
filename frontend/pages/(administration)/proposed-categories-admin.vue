<template>
  <div class="p-6 max-w-5xl mx-auto space-y-6">

    <PageHeader
      title="Categorías Propuestas"
      description="Revisa y aprueba o rechaza las categorías propuestas por usuarios."
      :icon="TagIcon"
      :breadcrumb="[{ label: 'Categorías Propuestas' }]"
      :stats="headerStats"
    />

    <div v-if="loadError" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ loadError }}</p>
      <button class="text-red-500 hover:text-red-700" @click="loadError = null">
        <XMarkIcon class="h-4 w-4" />
      </button>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-24 bg-gray-100 rounded-2xl animate-pulse" />
    </div>

    <div v-else-if="items.length === 0" class="bg-white rounded-2xl border border-gray-200 p-12 text-center">
      <CheckCircleIcon class="h-10 w-10 text-green-400 mx-auto mb-3" />
      <p class="text-sm text-gray-500">No hay propuestas pendientes por revisar.</p>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="item in items"
        :key="item.id"
        class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        <div class="px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full flex-shrink-0" :style="{ backgroundColor: item.color || '#6b7280' }" />
            <div>
              <p class="text-sm font-bold text-gray-900">{{ item.name }}</p>
              <p class="text-xs text-gray-400">{{ item.proposer?.firstName }} {{ item.proposer?.lastName }} · {{ item.proposer?.email }}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge bg-gray-100 text-gray-600">{{ targetLabel(item.target) }}</span>
            <span v-if="item.parentCategoryName" class="badge bg-blue-100 text-blue-700">
              Subcategoría de "{{ item.parentCategoryName }}"
            </span>
            <span class="badge bg-amber-100 text-amber-700">Enviado {{ formatDate(item.createdAt) }}</span>
          </div>
        </div>

        <div v-if="item.description" class="px-6 py-3 text-sm text-gray-600">
          {{ item.description }}
        </div>

        <div v-if="rejectingId === item.id" class="px-6 pb-4">
          <textarea
            v-model="rejectionReason"
            rows="2"
            placeholder="Motivo del rechazo (visible para el usuario)"
            class="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-red-400 resize-none"
          />
        </div>

        <div v-if="approvingId === item.id" class="px-6 pb-4">
          <div class="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
            <p class="text-xs text-amber-800 font-medium">
              ¿Confirmas aprobar la categoría <strong>"{{ item.name }}"</strong>? Aparecerá de inmediato
              en los filtros de búsqueda del marketplace.
            </p>
          </div>
        </div>

        <div class="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
          <template v-if="rejectingId === item.id">
            <button class="btn-secondary text-sm" @click="rejectingId = null">Cancelar</button>
            <button
              class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium disabled:opacity-60"
              :disabled="processingId === item.id || !rejectionReason.trim()"
              @click="confirmReject(item.id)"
            >
              Confirmar rechazo
            </button>
          </template>
          <template v-else-if="approvingId === item.id">
            <button class="btn-secondary text-sm" :disabled="processingId === item.id" @click="approvingId = null">Cancelar</button>
            <button
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-60"
              :disabled="processingId === item.id"
              @click="confirmApprove(item.id)"
            >
              {{ processingId === item.id ? 'Procesando…' : 'Sí, aprobar' }}
            </button>
          </template>
          <template v-else>
            <button
              class="px-4 py-2 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50"
              :disabled="processingId === item.id"
              @click="rejectingId = item.id; rejectionReason = ''"
            >
              Rechazar
            </button>
            <button
              class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium disabled:opacity-60"
              :disabled="processingId === item.id"
              @click="approvingId = item.id"
            >
              Aprobar
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] })

import { ref, computed, onMounted } from 'vue'
import { CheckCircleIcon, TagIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { useProposedCategories, type ProposedCategory, type ProposedCategoryTarget } from '~/composables/admin/useProposedCategories'
import { useDateFormat } from '~/composables/core/useDateFormat'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import PageHeader from '~/components/ui/PageHeader.vue'

// El guard de rol (SUPERADMIN/ADMIN) vive en middleware/auth.ts (ADMIN_ONLY_ROUTES)
const { fetchPending, review } = useProposedCategories()
const { formatDate: fmtDate } = useDateFormat()

const items = ref<ProposedCategory[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const processingId = ref<string | null>(null)
const rejectingId = ref<string | null>(null)
const approvingId = ref<string | null>(null)
const rejectionReason = ref('')

const headerStats = computed(() => [
  { label: 'Pendientes', value: items.value.length },
])

async function load() {
  loading.value = true
  try {
    const res = await fetchPending()
    items.value = res.data
  } finally {
    loading.value = false
  }
}

async function confirmApprove(id: string) {
  processingId.value = id
  loadError.value = null
  try {
    await review(id, 'APPROVED')
    items.value = items.value.filter(i => i.id !== id)
    approvingId.value = null
  } catch (e: any) {
    loadError.value = getApiErrorMessage(e, 'Error al aprobar la categoría propuesta')
  } finally {
    processingId.value = null
  }
}

async function confirmReject(id: string) {
  processingId.value = id
  loadError.value = null
  try {
    await review(id, 'REJECTED', rejectionReason.value.trim())
    items.value = items.value.filter(i => i.id !== id)
    rejectingId.value = null
  } catch (e: any) {
    loadError.value = getApiErrorMessage(e, 'Error al rechazar la categoría propuesta')
  } finally {
    processingId.value = null
  }
}

function targetLabel(target: ProposedCategoryTarget) {
  return ({ PRODUCT: 'Producto', SERVICE: 'Servicio', JOB: 'Empleo', USER_CATEGORY: 'Rubro de negocio' })[target] ?? target
}

function formatDate(iso: string) {
  return fmtDate(iso)
}

onMounted(load)
</script>
