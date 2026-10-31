<template>
  <div>
    <PageHeader
      title="Pagos recibidos"
      description="Pagos que tus clientes te reportan. Verifica que llegaron a tu cuenta y confírmalos."
      :icon="BanknotesIcon"
      :breadcrumb="[{ label: 'Pagos recibidos' }]"
      :stats="headerStats"
    />

    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="tab in TABS"
        :key="tab.value"
        class="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
        :class="activeTab === tab.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'"
        @click="setTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ error }}</div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card p-5 animate-pulse h-24" />
    </div>

    <div v-else-if="reports.length === 0" class="card p-10 text-center">
      <BanknotesIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
      <p class="text-gray-900 font-medium">{{ activeTab === 'SUBMITTED' ? 'No tienes pagos por confirmar' : 'Sin pagos en esta lista' }}</p>
      <p class="text-sm text-gray-500 mt-1">
        ¿Aún no configuras dónde te pagan?
        <NuxtLink to="/settings" class="text-red-600 font-semibold hover:underline">Agrega tus cuentas de cobro</NuxtLink>
      </p>
    </div>

    <ul v-else class="space-y-3">
      <li v-for="r in reports" :key="r.id" class="card p-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-lg font-black text-gray-900">{{ formatPaymentAmount(r.paidAmount, r.paidCurrency) }}</p>
            <p class="text-sm text-gray-600 truncate">
              {{ r.payerName || 'Cliente' }} · {{ r.paymentIntent.metadata?.description || SOURCE_LABELS[r.paymentIntent.sourceType] }}
            </p>
            <p class="text-xs text-gray-500 mt-1">
              Ref. <span class="font-mono font-semibold text-gray-800">{{ r.reference }}</span>
              · {{ DIRECT_PAYMENT_METHOD_LABELS[r.destination.method as DirectPaymentMethod] ?? '' }}
              {{ r.destination.bankName ? `· ${r.destination.bankName}` : '' }}
              · pagado el {{ formatDate(r.paidAt) }}
              <span v-if="r.paymentIntent.currency !== r.paidCurrency">
                · equivale a {{ formatPaymentAmount(r.paymentIntent.amount, r.paymentIntent.currency) }}
              </span>
            </p>
            <p v-if="r.status === 'REJECTED'" class="text-xs text-red-600 mt-1">Rechazado: "{{ r.rejectionReason }}"</p>
          </div>

          <span v-if="r.status !== 'SUBMITTED'" class="badge" :class="r.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">
            {{ r.status === 'CONFIRMED' ? 'Confirmado' : 'Rechazado' }}
          </span>
          <div v-else class="flex gap-2 flex-shrink-0">
            <button class="btn-secondary text-sm" :disabled="busyId === r.id" @click="askReject(r)">No llegó</button>
            <button class="btn-primary text-sm" :disabled="busyId === r.id" @click="askConfirm(r)">Confirmar</button>
          </div>
        </div>
      </li>
    </ul>

    <!-- Rechazo con motivo -->
    <Teleport to="body">
      <div v-if="rejecting" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="rejecting = null" />
        <form class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3" @submit.prevent="submitReject">
          <h3 class="font-bold text-gray-900">No recibí este pago</h3>
          <p class="text-sm text-gray-600">
            Ref. {{ rejecting.reference }} por {{ formatPaymentAmount(rejecting.paidAmount, rejecting.paidCurrency) }}.
            El cliente verá el motivo y podrá reportarlo de nuevo.
          </p>
          <textarea
            v-model="rejectReason"
            rows="3"
            maxlength="300"
            class="input-field resize-none"
            placeholder="Ej. La referencia no aparece en mi cuenta / el monto llegó incompleto"
          />
          <p v-if="rejectError" class="text-sm text-red-600">{{ rejectError }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary text-sm" @click="rejecting = null">Cancelar</button>
            <button type="submit" class="btn-primary text-sm" :disabled="busyId === rejecting.id">Rechazar pago</button>
          </div>
        </form>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { BanknotesIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import {
  useDirectPayments,
  formatPaymentAmount,
  DIRECT_PAYMENT_METHOD_LABELS,
  type DirectPaymentReportStatus,
  type IncomingPaymentReport,
  type DirectPaymentMethod,
} from '~/composables/payments/useDirectPayments'
import { useConfirm } from '~/composables/ui/useConfirm'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ middleware: 'auth' })

const TABS: { value: DirectPaymentReportStatus | ''; label: string }[] = [
  { value: 'SUBMITTED', label: 'Por confirmar' },
  { value: 'CONFIRMED', label: 'Confirmados' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: '', label: 'Todos' },
]
const SOURCE_LABELS: Record<string, string> = {
  SERVICE_REQUEST: 'Solicitud de servicio',
  CATALOG_ORDER: 'Pedido de catálogo',
}

const { listIncoming, confirmReport, rejectReport } = useDirectPayments()
const { confirm } = useConfirm()

const reports = ref<IncomingPaymentReport[]>([])
const pendingCount = ref(0)
const activeTab = ref<DirectPaymentReportStatus | ''>('SUBMITTED')
const loading = ref(true)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const rejecting = ref<IncomingPaymentReport | null>(null)
const rejectReason = ref('')
const rejectError = ref<string | null>(null)

const headerStats = computed(() => [{ label: 'Por confirmar', value: String(pendingCount.value) }])

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })

async function load() {
  loading.value = true
  error.value = null
  try {
    const [list, pending] = await Promise.all([
      listIncoming(activeTab.value || undefined),
      activeTab.value === 'SUBMITTED' ? Promise.resolve(null) : listIncoming('SUBMITTED'),
    ])
    reports.value = list
    pendingCount.value = (pending ?? list).length
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudieron cargar los pagos')
  } finally {
    loading.value = false
  }
}

function setTab(tab: DirectPaymentReportStatus | '') {
  activeTab.value = tab
  load()
}

async function askConfirm(r: IncomingPaymentReport) {
  await confirm({
    title: 'Confirmar pago recibido',
    message: `¿Verificaste en tu banco que llegó ${formatPaymentAmount(r.paidAmount, r.paidCurrency)} con la referencia ${r.reference}? Esta acción no se puede deshacer.`,
    confirmText: 'Sí, llegó',
    onConfirm: async () => {
      busyId.value = r.id
      try {
        await confirmReport(r.id)
        await load()
      } catch (e) {
        return getApiErrorMessage(e, 'No se pudo confirmar el pago')
      } finally {
        busyId.value = null
      }
    },
  })
}

function askReject(r: IncomingPaymentReport) {
  rejecting.value = r
  rejectReason.value = ''
  rejectError.value = null
}

async function submitReject() {
  if (!rejecting.value) return
  if (rejectReason.value.trim().length < 5) {
    rejectError.value = 'Explica brevemente qué pasó (mínimo 5 caracteres).'
    return
  }
  const target = rejecting.value
  busyId.value = target.id
  try {
    await rejectReport(target.id, rejectReason.value.trim())
    rejecting.value = null
    await load()
  } catch (e) {
    rejectError.value = getApiErrorMessage(e, 'No se pudo rechazar el pago')
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>
