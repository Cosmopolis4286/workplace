<template>
  <div>
    <PageHeader
      title="Cobros y pagos"
      description="Comisiones de vendedores, garantías de Pago Protegido y retiros de billetera."
      :icon="ReceiptPercentIcon"
      :breadcrumb="[{ label: 'Administración' }, { label: 'Cobros y pagos' }]"
      :stats="headerStats"
    />

    <div class="flex flex-wrap gap-2 mb-5">
      <button
        v-for="t in visibleTabs"
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
              <button class="btn-secondary text-sm" :disabled="busyId === p.id" @click="askReject('statement', p.id, p.reference, p.sellerName || p.sellerEmail || 'Vendedor')">No llegó</button>
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

    <!-- Garantías de Pago Protegido -->
    <template v-else-if="tab === 'escrow'">
      <div v-if="loading" class="card p-6 animate-pulse h-24" />
      <div v-else-if="escrowReports.length === 0" class="card p-10 text-center text-sm text-gray-500">No hay garantías por verificar.</div>
      <ul v-else class="space-y-3">
        <li v-for="r in escrowReports" :key="r.id" class="card p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-lg font-black text-gray-900">{{ formatPaymentAmount(r.paidAmount, r.paidCurrency) }}</p>
              <p class="text-sm text-gray-600 truncate">
                {{ r.payerName || r.payerEmail }} · garantía de {{ money(r.amount) }}
                <template v-if="r.source"> · "{{ r.source.serviceName }}" con {{ r.source.providerName }}</template>
              </p>
              <p class="text-xs text-gray-500 mt-1">
                Ref. <span class="font-mono font-semibold text-gray-800">{{ r.reference }}</span>
                · pagado el {{ formatDate(r.paidAt) }} · reportado {{ formatDate(r.createdAt) }}
              </p>
            </div>
            <div v-if="isSuperAdmin" class="flex gap-2 flex-shrink-0">
              <button class="btn-secondary text-sm" :disabled="busyId === r.id" @click="askReject('escrow', r.id, r.reference, r.payerName || r.payerEmail)">No llegó</button>
              <button class="btn-primary text-sm" :disabled="busyId === r.id" @click="askConfirmEscrow(r)">Confirmar</button>
            </div>
            <span v-else class="text-xs text-gray-400">Solo SUPERADMIN confirma pagos</span>
          </div>
        </li>
      </ul>
    </template>

    <!-- Retiros de billetera -->
    <template v-else-if="tab === 'withdrawals'">
      <div v-if="loading" class="card p-6 animate-pulse h-24" />
      <div v-else-if="withdrawals.length === 0" class="card p-10 text-center text-sm text-gray-500">No hay retiros por pagar.</div>
      <ul v-else class="space-y-3">
        <li v-for="w in withdrawals" :key="w.id" class="card p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-lg font-black text-gray-900">{{ formatPaymentAmount(w.payoutAmount, w.payoutCurrency) }}</p>
              <p class="text-sm text-gray-600 truncate">{{ w.userName || w.userEmail }} · {{ money(w.amount) }} de su billetera · {{ formatDate(w.createdAt) }}</p>
              <dl class="mt-2 text-xs text-gray-600 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5">
                <dt class="text-gray-400">Método</dt><dd>{{ DIRECT_PAYMENT_METHOD_LABELS[w.destination.method] }}<template v-if="w.destination.bankName"> · {{ w.destination.bankCode }} {{ w.destination.bankName }}</template></dd>
                <dt class="text-gray-400">Titular</dt><dd>{{ w.destination.holderName }} · {{ w.destination.holderDocument }}</dd>
                <dt class="text-gray-400">Destino</dt><dd class="font-mono">{{ w.destination.phone || w.destination.accountNumber || w.destination.email }}</dd>
              </dl>
            </div>
            <div v-if="isSuperAdmin" class="flex gap-2 flex-shrink-0">
              <button class="btn-secondary text-sm" :disabled="busyId === w.id" @click="askReject('withdrawal', w.id, null, w.userName || w.userEmail)">Rechazar</button>
              <button class="btn-primary text-sm" :disabled="busyId === w.id" @click="askPaid(w)">Ya pagué</button>
            </div>
            <span v-else class="text-xs text-gray-400">Solo SUPERADMIN paga retiros</span>
          </div>
        </li>
      </ul>
    </template>

    <!-- Compras de créditos de uso -->
    <AdminCreditPurchasesQueue v-else-if="tab === 'credits'" />

    <!-- Cuentas de la plataforma -->
    <SellerPaymentAccountsCard v-else scope="platform" @saved="() => {}" />

    <!-- Rechazo con motivo -->
    <Teleport to="body">
      <div v-if="rejecting" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="rejecting = null" />
        <form class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3" @submit.prevent="submitReject">
          <h3 class="font-bold text-gray-900">{{ rejecting.kind === 'withdrawal' ? 'Rechazar retiro' : 'El pago no llegó' }}</h3>
          <p class="text-sm text-gray-600">
            <template v-if="rejecting.kind === 'withdrawal'">
              Retiro de {{ rejecting.who }}. El monto vuelve a su billetera y verá el motivo.
            </template>
            <template v-else>
              Ref. {{ rejecting.reference }} de {{ rejecting.who }}. Verá el motivo y podrá reportarlo de nuevo.
            </template>
          </p>
          <textarea v-model="rejectReason" rows="3" maxlength="300" class="input-field resize-none" :placeholder="rejecting.kind === 'withdrawal' ? 'Ej. Los datos de la cuenta no son válidos' : 'Ej. La referencia no aparece en la cuenta'" />
          <p v-if="rejectError" class="text-sm text-red-600">{{ rejectError }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary text-sm" @click="rejecting = null">Cancelar</button>
            <button type="submit" class="btn-primary text-sm" :disabled="busyId === rejecting.id">{{ rejecting.kind === 'withdrawal' ? 'Rechazar retiro' : 'Rechazar pago' }}</button>
          </div>
        </form>
      </div>
    </Teleport>

    <!-- Retiro pagado: referencia de la transferencia -->
    <Teleport to="body">
      <div v-if="paying" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" @click="paying = null" />
        <form class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-3" @submit.prevent="submitPaid">
          <h3 class="font-bold text-gray-900">Registrar transferencia</h3>
          <p class="text-sm text-gray-600">
            Envía {{ formatPaymentAmount(paying.payoutAmount, paying.payoutCurrency) }} a {{ paying.destination.holderName }} y escribe la referencia de la operación.
          </p>
          <input v-model="payoutReference" type="text" maxlength="30" class="input-field font-mono" placeholder="Ej. 00123456" />
          <p v-if="paidError" class="text-sm text-red-600">{{ paidError }}</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn-secondary text-sm" @click="paying = null">Cancelar</button>
            <button type="submit" class="btn-primary text-sm" :disabled="busyId === paying.id">Marcar pagado</button>
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
import AdminCreditPurchasesQueue from '~/components/payments/AdminCreditPurchasesQueue.vue'
import { useFeatures } from '~/composables/core/useFeatures'
import {
  useSellerBilling,
  STATEMENT_STATUS_CLASSES,
  STATEMENT_STATUS_LABELS,
  type AdminStatement,
  type AdminStatementPayment,
  type SellerStatementStatus,
} from '~/composables/payments/useSellerBilling'
import { DIRECT_PAYMENT_METHOD_LABELS, formatPaymentAmount } from '~/composables/payments/useDirectPayments'
import { useEscrowFunding, type AdminEscrowFundingReport } from '~/composables/payments/useEscrowFunding'
import { useWalletWithdrawals, type AdminWalletWithdrawal } from '~/composables/wallets/useWalletWithdrawals'
import { useAuth } from '~/composables/auth/useAuth'
import { useConfirm } from '~/composables/ui/useConfirm'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ middleware: 'auth' })

type Tab = 'payments' | 'escrow' | 'withdrawals' | 'credits' | 'statements' | 'accounts'
const TABS: { value: Tab; label: string }[] = [
  { value: 'payments', label: 'Comisiones por verificar' },
  { value: 'escrow', label: 'Garantías por verificar' },
  { value: 'withdrawals', label: 'Retiros por pagar' },
  { value: 'credits', label: 'Compras de créditos' },
  { value: 'statements', label: 'Estados de cuenta' },
  { value: 'accounts', label: 'Cuentas de cobro' },
]
type RejectKind = 'statement' | 'escrow' | 'withdrawal'

const { user } = useAuth()
const { listPayments, listStatements, confirmPayment, rejectPayment } = useSellerBilling()
const escrowFunding = useEscrowFunding()
const walletWithdrawals = useWalletWithdrawals()
const { confirm } = useConfirm()

// La pestaña de créditos solo existe con USAGE_CREDITS_ENABLED.
const { features } = useFeatures()
const visibleTabs = computed(() => TABS.filter(t => t.value !== 'credits' || features.value.usageCredits))
const isSuperAdmin = computed(() => user.value?.role === 'SUPERADMIN')
const tab = ref<Tab>('payments')
const payments = ref<AdminStatementPayment[]>([])
const statements = ref<AdminStatement[]>([])
const statementFilter = ref<SellerStatementStatus | ''>('')
const loading = ref(false)
const error = ref<string | null>(null)
const busyId = ref<string | null>(null)
const escrowReports = ref<AdminEscrowFundingReport[]>([])
const withdrawals = ref<AdminWalletWithdrawal[]>([])
const rejecting = ref<{ kind: RejectKind; id: string; reference: string | null; who: string } | null>(null)
const paying = ref<AdminWalletWithdrawal | null>(null)
const payoutReference = ref('')
const paidError = ref<string | null>(null)
const rejectReason = ref('')
const rejectError = ref<string | null>(null)

const money = (v: number | string) => formatPaymentAmount(Number(v), 'USD')
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Caracas' })
const headerStats = computed(() => {
  if (tab.value === 'escrow') return [{ label: 'Garantías por verificar', value: String(escrowReports.value.length) }]
  if (tab.value === 'withdrawals') return [{ label: 'Retiros por pagar', value: String(withdrawals.value.length) }]
  return [{ label: 'Comisiones por verificar', value: String(payments.value.length) }]
})

async function load() {
  if (tab.value === 'accounts' || tab.value === 'credits') return
  loading.value = true
  error.value = null
  try {
    if (tab.value === 'payments') payments.value = await listPayments('SUBMITTED')
    else if (tab.value === 'escrow') escrowReports.value = await escrowFunding.listReports('SUBMITTED')
    else if (tab.value === 'withdrawals') withdrawals.value = await walletWithdrawals.listAll('PENDING')
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

async function askConfirmEscrow(r: AdminEscrowFundingReport) {
  await confirm({
    title: 'Confirmar garantía recibida',
    message: `¿Verificaste en el banco que llegó ${formatPaymentAmount(r.paidAmount, r.paidCurrency)} con la referencia ${r.reference}? La plataforma retendrá ${money(r.amount)} como garantía de la solicitud.`,
    confirmText: 'Sí, llegó',
    onConfirm: async () => {
      busyId.value = r.id
      try {
        await escrowFunding.confirmReport(r.id)
        await load()
      } catch (e) {
        return getApiErrorMessage(e, 'No se pudo confirmar el pago')
      } finally {
        busyId.value = null
      }
    },
  })
}

function askPaid(w: AdminWalletWithdrawal) {
  paying.value = w
  payoutReference.value = ''
  paidError.value = null
}

async function submitPaid() {
  if (!paying.value) return
  const target = paying.value
  busyId.value = target.id
  paidError.value = null
  try {
    await walletWithdrawals.markPaid(target.id, payoutReference.value)
    paying.value = null
    await load()
  } catch (e) {
    paidError.value = getApiErrorMessage(e, 'No se pudo registrar el pago')
  } finally {
    busyId.value = null
  }
}

function askReject(kind: RejectKind, id: string, reference: string | null, who: string) {
  rejecting.value = { kind, id, reference, who }
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
    const reason = rejectReason.value.trim()
    if (target.kind === 'statement') await rejectPayment(target.id, reason)
    else if (target.kind === 'escrow') await escrowFunding.rejectReport(target.id, reason)
    else await walletWithdrawals.reject(target.id, reason)
    rejecting.value = null
    await load()
  } catch (e) {
    rejectError.value = getApiErrorMessage(e, 'No se pudo rechazar')
  } finally {
    busyId.value = null
  }
}

onMounted(load)
</script>
