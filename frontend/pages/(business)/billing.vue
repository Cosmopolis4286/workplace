<template>
  <div>
    <PageHeader
      title="Estado de cuenta"
      description="Comisiones de la plataforma por tus ventas. Se agrupan cada semana y se pagan en un solo pago."
      :icon="ReceiptPercentIcon"
      :breadcrumb="[{ label: 'Estado de cuenta' }]"
      :stats="headerStats"
    />

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{{ error }}</div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="card p-5 animate-pulse h-24" />
    </div>

    <template v-else-if="summary">
      <!-- Aviso de deuda vencida -->
      <div v-if="blockingStatement" class="mb-5 p-4 rounded-xl border flex gap-3" :class="blockingStatement.status === 'SUSPENDED' ? 'bg-red-600 border-red-700 text-white' : 'bg-red-50 border-red-200 text-red-800'">
        <ExclamationTriangleIcon class="h-5 w-5 flex-shrink-0" />
        <div class="text-sm">
          <p class="font-semibold">
            {{ blockingStatement.status === 'SUSPENDED' ? 'Tus publicaciones están pausadas' : 'Tienes un estado de cuenta vencido' }}
          </p>
          <p class="mt-0.5 opacity-90">
            <template v-if="blockingStatement.status === 'SUSPENDED'">
              Paga {{ money(blockingStatement.totalAmount) }} para reactivarlas automáticamente.
            </template>
            <template v-else>
              No puedes publicar ni activar servicios o productos hasta pagar {{ money(blockingStatement.totalAmount) }}.
              Si no pagas antes del {{ formatDateTime(suspensionAt(blockingStatement)) }}, se pausará todo lo que tienes publicado.
            </template>
          </p>
        </div>
      </div>

      <!-- Semana en curso -->
      <section class="card p-5 mb-6">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p class="text-xs text-gray-500">Acumulado esta semana (desde el {{ formatDate(summary.currentPeriod.start) }})</p>
            <p class="text-2xl font-black text-gray-900">{{ money(summary.currentPeriod.accrued) }}</p>
            <p class="text-xs text-gray-400 mt-1">
              Se factura el próximo lunes; tendrás {{ summary.dueDays }} días para pagarlo.
            </p>
          </div>
          <button
            v-if="summary.currentPeriod.charges.length"
            class="text-sm font-semibold text-gray-600 hover:text-gray-900"
            @click="showCurrent = !showCurrent"
          >
            {{ showCurrent ? 'Ocultar detalle' : `Ver ${summary.currentPeriod.charges.length} cargo(s)` }}
          </button>
        </div>
        <ul v-if="showCurrent" class="mt-4 divide-y divide-gray-100">
          <li v-for="c in summary.currentPeriod.charges" :key="c.id" class="py-2 flex justify-between text-sm">
            <span class="text-gray-600">{{ CHARGE_TYPE_LABELS[c.type] }} · {{ formatDate(c.createdAt) }}</span>
            <span class="font-semibold text-gray-900">{{ money(c.amount) }}</span>
          </li>
        </ul>
      </section>

      <!-- Estados de cuenta -->
      <h2 class="text-sm font-bold text-gray-900 mb-3">Estados de cuenta</h2>
      <div v-if="summary.statements.length === 0" class="card p-8 text-center text-sm text-gray-500">
        Todavía no tienes estados de cuenta. Se emiten cada lunes con las comisiones de la semana anterior.
      </div>
      <ul v-else class="space-y-3">
        <li v-for="st in summary.statements" :key="st.id" class="card p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-lg font-black text-gray-900">{{ money(st.totalAmount) }}</p>
              <p class="text-sm text-gray-600">
                Semana del {{ formatDate(st.periodStart) }} al {{ formatDate(lastDay(st.periodEnd)) }}
                · {{ st.charges?.length ?? 0 }} cargo(s)
              </p>
              <p v-if="Number(st.vatAmount) > 0" class="text-xs text-gray-500">
                Comisiones {{ money(st.commissionsAmount ?? 0) }} + IVA ({{ Number(st.vatRate) }} %) {{ money(st.vatAmount ?? 0) }}
              </p>
              <p class="text-xs mt-1" :class="isOpen(st) ? 'text-gray-700 font-medium' : 'text-gray-400'">
                <template v-if="st.status === 'PAID'">Pagado el {{ formatDate(st.paidAt!) }}</template>
                <template v-else>Vence el {{ formatDateTime(st.dueAt) }}</template>
              </p>
              <p v-if="lastRejected(st)" class="text-xs text-red-600 mt-1">
                Pago rechazado (ref. {{ lastRejected(st)!.reference }}): "{{ lastRejected(st)!.rejectionReason }}"
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="badge" :class="STATEMENT_STATUS_CLASSES[st.status]">{{ STATEMENT_STATUS_LABELS[st.status] }}</span>
              <button v-if="isOpen(st)" class="btn-primary text-sm" @click="openPay(st)">Pagar</button>
            </div>
          </div>
        </li>
      </ul>
    </template>

    <!-- Pago del estado de cuenta -->
    <Teleport to="body">
      <div v-if="paying" class="fixed inset-0 z-[55] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="!submitting && (paying = null)" />
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div class="p-5 border-b border-gray-100 flex items-start justify-between gap-3">
            <div>
              <h3 class="font-black text-gray-900">Pagar estado de cuenta</h3>
              <p class="text-xs text-gray-500 mt-0.5">
                {{ money(paying.totalAmount) }} · semana del {{ formatDate(paying.periodStart) }}. Un administrador confirmará tu pago.
              </p>
            </div>
            <button class="p-1 text-gray-400 hover:text-gray-600" :disabled="submitting" @click="paying = null">
              <XMarkIcon class="h-5 w-5" />
            </button>
          </div>
          <div class="p-5">
            <div v-if="optionsLoading" class="space-y-3">
              <div v-for="i in 2" :key="i" class="skeleton h-14 rounded-xl" />
            </div>
            <PaymentReportForm
              v-else
              :accounts="payAccounts"
              :base-amount="paying.totalAmount"
              :base-currency="paying.currency"
              :banks="banks"
              :submitting="submitting"
              :error="payError"
              @submit="submitPayment"
            />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ExclamationTriangleIcon, ReceiptPercentIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import PaymentReportForm, { type PaymentReportPayload } from '~/components/payments/PaymentReportForm.vue'
import {
  useSellerBilling,
  CHARGE_TYPE_LABELS,
  STATEMENT_STATUS_CLASSES,
  STATEMENT_STATUS_LABELS,
  type SellerBillingSummary,
  type SellerStatement,
} from '~/composables/payments/useSellerBilling'
import { useDirectPayments, formatPaymentAmount, type PayableSellerAccount } from '~/composables/payments/useDirectPayments'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ middleware: 'auth' })

const { getMySummary, getPaymentOptions, reportPayment } = useSellerBilling()
const { banks, loadBanks } = useDirectPayments()

const summary = ref<SellerBillingSummary | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const showCurrent = ref(false)

const paying = ref<SellerStatement | null>(null)
const payAccounts = ref<PayableSellerAccount[]>([])
const optionsLoading = ref(false)
const submitting = ref(false)
const payError = ref<string | null>(null)

const OPEN = ['ISSUED', 'OVERDUE', 'SUSPENDED']
const isOpen = (st: SellerStatement) => OPEN.includes(st.status)
const money = (v: number | string) => formatPaymentAmount(Number(v), 'USD')

const blockingStatement = computed(() =>
  summary.value?.statements.find(s => s.status === 'SUSPENDED') ??
  summary.value?.statements.find(s => s.status === 'OVERDUE') ??
  null,
)
const pendingTotal = computed(() =>
  (summary.value?.statements ?? [])
    .filter(s => s.status !== 'PAID')
    .reduce((sum, s) => sum + Number(s.totalAmount), 0),
)
const headerStats = computed(() => [
  { label: 'Por pagar', value: money(pendingTotal.value) },
  { label: 'Esta semana', value: money(summary.value?.currentPeriod.accrued ?? 0) },
])

const tz = { timeZone: 'America/Caracas' } as const
const formatDate = (iso: string | Date) =>
  new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', ...tz })
const formatDateTime = (iso: string | Date) =>
  new Date(iso).toLocaleString('es-VE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', ...tz })
// periodEnd es el lunes 00:00 siguiente: el último día incluido es el domingo.
const lastDay = (iso: string) => new Date(new Date(iso).getTime() - 1)
const suspensionAt = (st: SellerStatement) =>
  new Date(new Date(st.dueAt).getTime() + (summary.value?.graceHours ?? 48) * 3600 * 1000)
const lastRejected = (st: SellerStatement) =>
  isOpen(st) ? (st.payments ?? []).find(p => p.status === 'REJECTED') ?? null : null

async function load() {
  loading.value = true
  error.value = null
  try {
    summary.value = await getMySummary()
  } catch (e) {
    error.value = getApiErrorMessage(e, 'No se pudo cargar tu estado de cuenta')
  } finally {
    loading.value = false
  }
}

async function openPay(st: SellerStatement) {
  paying.value = st
  payError.value = null
  optionsLoading.value = true
  try {
    const [options] = await Promise.all([getPaymentOptions(st.id), loadBanks().catch(() => [])])
    payAccounts.value = options.accounts
  } catch (e) {
    payError.value = getApiErrorMessage(e, 'No se pudieron cargar las cuentas de pago')
    payAccounts.value = []
  } finally {
    optionsLoading.value = false
  }
}

async function submitPayment(payload: PaymentReportPayload) {
  if (!paying.value) return
  submitting.value = true
  payError.value = null
  try {
    await reportPayment(paying.value.id, {
      platformAccountId: payload.accountId,
      reference: payload.reference,
      paidAt: payload.paidAt,
      payerBankCode: payload.payerBankCode,
    })
    paying.value = null
    await load()
  } catch (e) {
    payError.value = getApiErrorMessage(e, 'No se pudo reportar el pago')
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>
