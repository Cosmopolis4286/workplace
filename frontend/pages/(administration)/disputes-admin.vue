<template>
  <div>
    <PageHeader
      title="Disputas"
      description="Problemas reportados en operaciones con Pago Protegido. La garantía queda congelada hasta que decidas a quién se entrega."
      :icon="ScaleIcon"
      :breadcrumb="[{ label: 'Administración' }, { label: 'Disputas' }]"
      :stats="[{ label: 'Abiertas', value: String(disputes.length) }]"
    />

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ error }}</div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="card p-6 animate-pulse h-28" />
    </div>
    <div v-else-if="disputes.length === 0" class="card p-10 text-center text-sm text-gray-500">No hay disputas abiertas.</div>

    <ul v-else class="space-y-3">
      <li v-for="d in disputes" :key="d.id" class="card p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {{ d.escrow.entityType === 'SERVICE_REQUEST' ? 'Solicitud de servicio' : 'Pedido del catálogo' }}
              · abierta el {{ formatDate(d.createdAt) }}
            </p>
            <p class="text-lg font-black text-gray-900">{{ d.entityName }} · {{ money(d.escrow.amount) }}</p>
            <p class="text-sm text-gray-600">
              Cliente: <strong>{{ d.payerName || '—' }}</strong> · Proveedor: <strong>{{ d.payeeName || '—' }}</strong>
            </p>
            <p class="text-sm mt-2">
              <span class="font-semibold">{{ d.raisedByRole === 'PAYER' ? 'El cliente' : 'El proveedor' }} reporta:</span>
              <span class="italic text-gray-700">"{{ d.reason }}"</span>
            </p>
          </div>
          <div v-if="isSuperAdmin" class="flex flex-wrap gap-2 flex-shrink-0">
            <button class="btn-secondary text-sm" :disabled="busyId === d.id" @click="startResolve(d, 'REFUND_FULL')">Devolver al cliente</button>
            <button class="btn-secondary text-sm" :disabled="busyId === d.id" @click="startResolve(d, 'SPLIT')">Repartir</button>
            <button class="btn-primary text-sm" :disabled="busyId === d.id" @click="startResolve(d, 'RELEASE_FULL')">Pagar al proveedor</button>
          </div>
          <span v-else class="text-xs text-gray-400">Solo SUPERADMIN resuelve disputas</span>
        </div>
      </li>
    </ul>

    <!-- Confirmar resolución -->
    <Teleport to="body">
      <div v-if="resolving" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="resolving = null" />
        <form class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3" @submit.prevent="submitResolve">
          <h3 class="font-bold text-gray-900">{{ RESOLUTION_TITLES[resolving.resolution] }}</h3>
          <p class="text-sm text-gray-600">
            {{ resolving.dispute.entityName }} · garantía de {{ money(resolving.dispute.escrow.amount) }}.
            <template v-if="resolving.resolution === 'REFUND_FULL'">Todo vuelve al cliente y la solicitud queda cancelada, sin comisión.</template>
            <template v-else-if="resolving.resolution === 'RELEASE_FULL'">Todo va al proveedor y la solicitud queda cerrada; se cobra la comisión.</template>
            <template v-else>Indica cuánto recibe cada uno; deben sumar el total. La comisión se cobra sobre lo que recibe el proveedor.</template>
          </p>
          <div v-if="resolving.resolution === 'SPLIT'" class="grid grid-cols-2 gap-3">
            <label class="text-xs text-gray-600">Al proveedor
              <input v-model.number="releaseAmount" type="number" min="0" step="0.01" class="input-field mt-1" @input="syncSplit('release')" />
            </label>
            <label class="text-xs text-gray-600">Al cliente
              <input v-model.number="refundAmount" type="number" min="0" step="0.01" class="input-field mt-1" @input="syncSplit('refund')" />
            </label>
          </div>
          <textarea v-model="note" rows="3" maxlength="500" class="input-field resize-none" placeholder="Nota de la decisión (la verán en el historial)" />
          <p v-if="resolveError" class="text-sm text-red-600">{{ resolveError }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary text-sm" @click="resolving = null">Cancelar</button>
            <button type="submit" class="btn-primary text-sm" :disabled="busyId === resolving.dispute.id">Confirmar</button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ScaleIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useAuth } from '~/composables/auth/useAuth'
import { useApi } from '~/composables/core/useApi'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'
import { formatPaymentAmount } from '~/composables/payments/useDirectPayments'

definePageMeta({ middleware: 'auth' })

type Resolution = 'RELEASE_FULL' | 'REFUND_FULL' | 'SPLIT'
interface OpenDispute {
  id: string
  reason: string
  raisedByRole: 'PAYER' | 'PAYEE'
  createdAt: string
  entityName: string
  payerName: string | null
  payeeName: string | null
  escrow: { entityType: 'SERVICE_REQUEST' | 'CATALOG_ORDER'; entityId: string; amount: number }
}

const RESOLUTION_TITLES: Record<Resolution, string> = {
  REFUND_FULL: 'Devolver todo al cliente',
  RELEASE_FULL: 'Pagar todo al proveedor',
  SPLIT: 'Repartir la garantía',
}

const { user } = useAuth()
const { get, patch } = useApi()
const isSuperAdmin = computed(() => user.value?.role === 'SUPERADMIN')

const disputes = ref<OpenDispute[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const resolving = ref<{ dispute: OpenDispute; resolution: Resolution } | null>(null)
const releaseAmount = ref<number>(0)
const refundAmount = ref<number>(0)
const note = ref('')
const resolveError = ref<string | null>(null)

const money = (v: number | string) => formatPaymentAmount(Number(v), 'USD')
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Caracas' })
const round2 = (n: number) => Math.round(n * 100) / 100

async function load() {
  loading.value = true
  error.value = null
  try {
    disputes.value = await get<OpenDispute[]>('/escrow/disputes/open')
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar las disputas')
  } finally {
    loading.value = false
  }
}

function startResolve(dispute: OpenDispute, resolution: Resolution) {
  resolving.value = { dispute, resolution }
  const total = Number(dispute.escrow.amount)
  releaseAmount.value = round2(total / 2)
  refundAmount.value = round2(total - releaseAmount.value)
  note.value = ''
  resolveError.value = null
}

// Al editar un lado, el otro se ajusta para que siempre sumen el total.
function syncSplit(changed: 'release' | 'refund') {
  if (!resolving.value) return
  const total = Number(resolving.value.dispute.escrow.amount)
  if (changed === 'release') refundAmount.value = round2(Math.max(total - (releaseAmount.value || 0), 0))
  else releaseAmount.value = round2(Math.max(total - (refundAmount.value || 0), 0))
}

async function submitResolve() {
  if (!resolving.value) return
  const { dispute, resolution } = resolving.value
  const body: Record<string, unknown> = { resolution, resolutionNote: note.value.trim() || undefined }
  if (resolution === 'SPLIT') {
    body.releaseAmount = round2(releaseAmount.value || 0)
    body.refundAmount = round2(refundAmount.value || 0)
  }
  // Las de solicitudes de servicio además cierran/cancelan la solicitud.
  const url =
    dispute.escrow.entityType === 'SERVICE_REQUEST'
      ? `/services/requests/disputes/${dispute.id}/resolve`
      : `/escrow/disputes/${dispute.id}/resolve`
  busyId.value = dispute.id
  resolveError.value = null
  try {
    await patch(url, body)
    resolving.value = null
    await load()
  } catch (e) {
    resolveError.value = getApiErrorMessage(e, 'No se pudo resolver la disputa')
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>
