<template>
  <div>
    <PageHeader
      title="Cobros a vendedores"
      description="Estados de cuenta semanales de comisiones y los pagos que reportan los vendedores."
      :icon="ReceiptPercentIcon"
      :breadcrumb="[{ label: 'Administración' }, { label: 'Cobros a vendedores' }]"
      :stats="headerStats"
    />

    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="t in TABS"
        :key="t.value"
        class="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
        :class="tab === t.value ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'"
        @click="setTab(t.value)"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ error }}</div>

    <!-- Pagos por verificar -->
    <template v-if="tab === 'payments'">
      <div v-if="loading" class="card p-6 animate-pulse h-24" />
      <div v-else-if="payments.length === 0" class="card p-10 text-center text-sm text-gray-500">No hay pagos por verificar.</div>
      <ul v-else class="space-y-3">
        <li v-for="p in payments" :key="p.id" class="card p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-lg font-black text-gray-900">{{ formatPaymentAmount(p.paidAmount, p.paidCurrency) }}</p>
              <p class="text-sm text-gray-600 truncate">
                {{ p.sellerName || p.sellerEmail || 'Vendedor' }} · estado de cuenta de {{ money(p.statement.totalAmount) }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                Ref. <span class="font-mono font-semibold text-gray-800">{{ p.reference }}</span>
                · pagado el {{ formatDate(p.paidAt) }} · reportado {{ formatDate(p.createdAt) }}
              </p>
            </div>
            <div v-if="isSuperAdmin" class="flex gap-2 flex-shrink-0">
              <button class="btn-secondary text-sm" :disabled="busyId === p.id" @click="askReject(p)">No llegó</button>
              <button class="btn-primary text-sm" :disabled="busyId === p.id" @click="askConfirm(p)">Confirmar</button>
            </div>
            <span v-else class="text-xs text-gray-400">Solo SUPERADMIN confirma pagos</span>
          </div>
        </li>
      </ul>
    </template>

    <!-- Estados de cuenta -->
    <template v-else-if="tab === 'statements'">
      <select v-model="statementFilter" class="input-field bg-white max-w-xs mb-4" @change="load">
        <option value="">Todos</option>
        <option v-for="(label, value) in STATEMENT_STATUS_LABELS" :key="value" :value="value">{{ label }}</option>
      </select>
      <div v-if="loading" class="card p-6 animate-pulse h-24" />
      <div v-else-if="statements.length === 0" class="card p-10 text-center text-sm text-gray-500">Sin estados de cuenta.</div>
      <div v-else class="card overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="text-left text-xs text-gray-500 border-b border-gray-100">
            <tr>
              <th class="p-3">Vendedor</th>
              <th class="p-3">Semana</th>
              <th class="p-3 text-right">Monto</th>
              <th class="p-3">Vence</th>
              <th class="p-3">Estado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="st in statements" :key="st.id">
              <td class="p-3 text-gray-900">{{ st.sellerName || st.sellerEmail }}</td>
              <td class="p-3 text-gray-600">{{ formatDate(st.periodStart) }}</td>
              <td class="p-3 text-right font-semibold">{{ money(st.totalAmount) }}</td>
              <td class="p-3 text-gray-600">{{ formatDate(st.dueAt) }}</td>
              <td class="p-3"><span class="badge" :class="STATEMENT_STATUS_CLASSES[st.status]">{{ STATEMENT_STATUS_LABELS[st.status] }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- Cuentas de la plataforma -->
    <SellerPaymentAccountsCard v-else scope="platform" @saved="() => {}" />

    <!-- Rechazo con motivo -->
    <Teleport to="body">
      <div v-if="rejecting" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="rejecting = null" />
        <form class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3" @submit.prevent="submitReject">
          <h3 class="font-bold text-gray-900">El pago no llegó</h3>
          <p class="text-sm text-gray-600">
            Ref. {{ rejecting.reference }} de {{ rejecting.sellerName || rejecting.sellerEmail }}. El vendedor verá el motivo y podrá reportarlo de nuevo.
          </p>
          <textarea v-model="rejectReason" rows="3" maxlength="300" class="input-field resize-none" placeholder="Ej. La referencia no aparece en la cuenta" />
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
import { ReceiptPercentIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import SellerPaymentAccountsCard from '~/components/settings/SellerPaymentAccountsCard.vue'
import {
  useSellerBilling,
  STATEMENT_STATUS_CLASSES,
  STATEMENT_STATUS_LABELS,
  type AdminStatement,
  type AdminStatementPayment,
  type SellerStatementStatus,
} from '~/composables/payments/useSellerBilling'
import { formatPaymentAmount } from '~/composables/payments/useDirectPayments'
import { useAuth } from '~/composables/auth/useAuth'
import { useConfirm } from '~/composables/ui/useConfirm'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ middleware: 'auth' })

type Tab = 'payments' | 'statements' | 'accounts'
const TABS: { value: Tab; label: string }[] = [
  { value: 'payments', label: 'Pagos por verificar' },
  { value: 'statements', label: 'Estados de cuenta' },
  { value: 'accounts', label: 'Cuentas de cobro' },
]

const { user } = useAuth()
const { listPayments, listStatements, confirmPayment, rejectPayment } = useSellerBilling()
const { confirm } = useConfirm()

const isSuperAdmin = computed(() => user.value?.role === 'SUPERADMIN')
const tab = ref<Tab>('payments')
const payments = ref<AdminStatementPayment[]>([])
const statements = ref<AdminStatement[]>([])
const statementFilter = ref<SellerStatementStatus | ''>('')
const loading = ref(false)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const rejecting = ref<AdminStatementPayment | null>(null)
const rejectReason = ref('')
const rejectError = ref<string | null>(null)

const money = (v: number | string) => formatPaymentAmount(Number(v), 'USD')
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Caracas' })
const headerStats = computed(() => [{ label: 'Pagos por verificar', value: String(payments.value.length) }])

async function load() {
  if (tab.value === 'accounts') return
  loading.value = true
  error.value = null
  try {
    if (tab.value === 'payments') payments.value = await listPayments('SUBMITTED')
    else statements.value = await listStatements(statementFilter.value || undefined)
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo cargar la información')
  } finally {
    loading.value = false
  }
}

function setTab(value: Tab) {
  tab.value = value
  load()
}

async function askConfirm(p: AdminStatementPayment) {
  await confirm({
    title: 'Confirmar pago recibido',
    message: `¿Verificaste en el banco que llegó ${formatPaymentAmount(p.paidAmount, p.paidCurrency)} con la referencia ${p.reference}? El estado de cuenta quedará pagado y, si estaba suspendido, se reactivarán las publicaciones del vendedor.`,
    confirmText: 'Sí, llegó',
    onConfirm: async () => {
      busyId.value = p.id
      try {
        await confirmPayment(p.id)
        await load()
      } catch (e) {
        return getApiErrorMessage(e, 'No se pudo confirmar el pago')
      } finally {
        busyId.value = null
      }
    },
  })
}

function askReject(p: AdminStatementPayment) {
  rejecting.value = p
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
    await rejectPayment(target.id, rejectReason.value.trim())
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
