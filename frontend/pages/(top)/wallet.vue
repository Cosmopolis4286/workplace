<template>
  <div>
    <PageHeader
      title="Billetera"
      description="Tu saldo de devoluciones y cobros de Pago Protegido. Retíralo a tu banco cuando quieras."
      :icon="WalletIcon"
      :breadcrumb="[{ label: 'Billetera' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton v-if="!wallet && !loading" variant="primary" :icon="PlusIcon" @click="handleCreate">
          Crear billetera
        </HeaderActionButton>
        <template v-if="wallet && wallet.status === 'ACTIVE'">
          <HeaderActionButton variant="primary" :icon="ArrowUpTrayIcon" @click="openWithdrawal">
            Retirar a mi banco
          </HeaderActionButton>
        </template>
        <HeaderActionButton :icon="ArrowPathIcon" :loading="loading" :disabled="loading" @click="reload">
          Actualizar
        </HeaderActionButton>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="reload"><ArrowPathIcon class="h-4 w-4" /></button>
    </div>

    <!-- Toast -->
    <Transition name="toast">
      <div
        v-if="toast"
        class="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium"
        :class="toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'"
      >
        <CheckCircleIcon v-if="toast.type === 'success'" class="h-5 w-5" />
        <XCircleIcon v-else class="h-5 w-5" />
        {{ toast.message }}
      </div>
    </Transition>

    <!-- La billetera ya no se recarga -->
    <div class="mb-6 p-4 rounded-xl border border-blue-100 bg-blue-50 flex gap-3 text-sm text-blue-900">
      <InformationCircleIcon class="h-5 w-5 flex-shrink-0 text-blue-600" />
      <p>
        La billetera ya no se recarga ni transfiere entre usuarios. Pagas directo al vendedor, y si usas
        <strong>Pago Protegido</strong>, pagas la garantía de cada solicitud a una cuenta de la plataforma.
        Lo que quede aquí (devoluciones o cobros) lo puedes retirar a tu banco.
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- ── Main ─────────────────────────────────────────────────────────── -->
      <section class="lg:col-span-2 space-y-6">
        <WalletCard
          :wallet="wallet"
          :loading="loading"
          :format-money="formatMoney"
          :format-date="formatDate"
          :status-labels="STATUS_LABELS"
          :status-classes="STATUS_CLASSES"
          @open-modal="openModal"
          @withdraw="openWithdrawal"
          @create="handleCreate"
        />

        <!-- Retiros -->
        <section v-if="withdrawals.length" class="card p-5">
          <h2 class="text-sm font-bold text-gray-900 mb-3">Mis retiros</h2>
          <ul class="divide-y divide-gray-100">
            <li v-for="w in withdrawals" :key="w.id" class="py-3 flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-semibold text-gray-900">
                  {{ formatMoney(Number(w.amount), 'USD') }}
                  <span class="font-normal text-gray-500">→ {{ formatPaymentAmount(Number(w.payoutAmount), w.payoutCurrency) }}</span>
                </p>
                <p class="text-xs text-gray-500 truncate">
                  {{ DIRECT_PAYMENT_METHOD_LABELS[w.destination.method] }} · {{ w.destination.bankName ?? w.destination.email }}
                  · {{ formatDate(w.createdAt) }}
                </p>
                <p v-if="w.payoutReference" class="text-xs text-gray-500">Ref. <span class="font-mono">{{ w.payoutReference }}</span></p>
                <p v-if="w.rejectionReason" class="text-xs text-red-600">"{{ w.rejectionReason }}" — el monto volvió a tu billetera</p>
              </div>
              <span class="badge" :class="WITHDRAWAL_STATUS_CLASSES[w.status]">{{ WITHDRAWAL_STATUS_LABELS[w.status] }}</span>
            </li>
          </ul>
        </section>

        <WalletTransactionsList
          :transactions="transactions"
          :meta="transactionsMeta"
          :loading="loadingTx"
          :filters="txFilters"
          :active-filter="txFilter"
          :currency="wallet?.currency"
          :type-labels="TYPE_LABELS"
          :type-classes="TYPE_CLASSES"
          :format-money="formatMoney"
          :format-date-time="formatDateTime"
          @filter="setTxFilter"
          @page="goTxPage"
        />
      </section>

      <WalletSidebar
        :wallet="wallet"
        :limits-status="limitsStatus"
        :status-labels="STATUS_LABELS"
        :credit-total="transactions.length > 0 ? creditTotal : null"
        :debit-total="debitTotal"
        :format-money="formatMoney"
        @open-pin-modal="openModal('pin')"
      />
    </div>

    <WalletModals
      :active-modal="activeModal"
      :wallet="wallet"
      :loading="loading"
      :modal-error="modalError"
      @close="closeModal"
      @pin-submit="handlePin"
    />

    <WithdrawalRequestModal
      v-if="showWithdrawal && wallet"
      :balance="Number(wallet.balance)"
      @close="showWithdrawal = false"
      @created="onWithdrawalCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  PlusIcon,
  WalletIcon,
  XCircleIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import HeaderActionButton from '~/components/ui/HeaderActionButton.vue'
import WalletCard from '~/components/wallet/WalletCard.vue'
import WalletTransactionsList from '~/components/wallet/WalletTransactionsList.vue'
import WalletSidebar from '~/components/wallet/WalletSidebar.vue'
import WalletModals from '~/components/wallet/WalletModals.vue'
import WithdrawalRequestModal from '~/components/wallet/WithdrawalRequestModal.vue'
import { useWallets, type WalletTransactionType } from '~/composables/wallets/useWallets'
import {
  useWalletWithdrawals,
  WITHDRAWAL_STATUS_CLASSES,
  WITHDRAWAL_STATUS_LABELS,
  type WalletWithdrawal,
} from '~/composables/wallets/useWalletWithdrawals'
import { DIRECT_PAYMENT_METHOD_LABELS, formatPaymentAmount } from '~/composables/payments/useDirectPayments'
import { useDateFormat } from '~/composables/core/useDateFormat'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const { formatDate: fmtDate, formatDateTime: fmtDateTime } = useDateFormat()
const {
  wallet, transactions, transactionsMeta, limitsStatus,
  loading, loadingTx, error,
  fetchMyWallet, createMyWallet, fetchMyTransactions, fetchMyLimits,
  setPin, changePin,
  formatMoney,
  STATUS_LABELS, STATUS_CLASSES, TYPE_LABELS, TYPE_CLASSES,
} = useWallets()

const { listMine: listMyWithdrawals } = useWalletWithdrawals()
const withdrawals = ref<WalletWithdrawal[]>([])
const showWithdrawal = ref(false)

function openWithdrawal() {
  if (!wallet.value?.hasPin) {
    showToast('error', 'Configura el PIN de tu billetera antes de retirar')
    openModal('pin')
    return
  }
  showWithdrawal.value = true
}

async function onWithdrawalCreated() {
  showWithdrawal.value = false
  showToast('success', 'Retiro solicitado. Te avisaremos cuando se haga la transferencia.')
  await reload()
}

async function loadWithdrawals() {
  try { withdrawals.value = await listMyWithdrawals() } catch { withdrawals.value = [] }
}

// ── Filters ──────────────────────────────────────────────────────────────────────
const txFilters: { label: string; value: WalletTransactionType | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Créditos', value: 'CREDIT' },
  { label: 'Débitos', value: 'DEBIT' },
  { label: 'Ajustes', value: 'ADJUSTMENT' },
]
const txFilter = ref<WalletTransactionType | undefined>(undefined)
async function setTxFilter(f: WalletTransactionType | undefined) {
  txFilter.value = f; await fetchMyTransactions(1, 20, f)
}
async function goTxPage(page: number) { await fetchMyTransactions(page, 20, txFilter.value) }

// ── Quick stats ───────────────────────────────────────────────────────────────────
const creditTotal = computed(() => transactions.value.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0))
const debitTotal  = computed(() => transactions.value.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0))

// ── Header stats ──────────────────────────────────────────────────────────────────
const headerStats = computed(() =>
  wallet.value
    ? [
        { label: 'Saldo',       value: formatMoney(wallet.value.balance, wallet.value.currency) },
        { label: 'Moneda',      value: wallet.value.currency },
        { label: 'Estado',      value: STATUS_LABELS[wallet.value.status] },
        { label: 'Movimientos', value: String(wallet.value._count?.transactions ?? 0) },
      ]
    : [{ label: 'Estado', value: 'Sin billetera' }]
)

// ── Date helpers ──────────────────────────────────────────────────────────────────
function formatDate(date: string) {
  return fmtDate(date)
}
function formatDateTime(date: string) {
  return fmtDateTime(date)
}

// ── Toast ─────────────────────────────────────────────────────────────────────────
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null
function showToast(type: 'success' | 'error', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { type, message }
  toastTimer = setTimeout(() => { toast.value = null }, 3500)
}

// ── Modal ─────────────────────────────────────────────────────────────────────────
type ModalType = 'pin'
const activeModal = ref<ModalType | null>(null)
const modalError  = ref<string | null>(null)

function openModal(type: ModalType) {
  activeModal.value = type; modalError.value = null
}
function closeModal() { activeModal.value = null; modalError.value = null }

async function handlePin(payload: { pin: string; pinConfirm: string; currentPin: string }) {
  if (!payload.pin || payload.pin !== payload.pinConfirm) {
    modalError.value = 'Los PINs no coinciden'; return
  }
  modalError.value = null
  try {
    if (wallet.value?.hasPin) {
      await changePin(payload.currentPin, payload.pin)
      showToast('success', 'PIN cambiado correctamente')
    } else {
      await setPin(payload.pin)
      showToast('success', 'PIN configurado correctamente')
    }
    closeModal()
  } catch (e: any) { modalError.value = e?.message ?? 'Error al configurar PIN' }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────────
async function reload() {
  const w = await fetchMyWallet()
  if (w) await Promise.allSettled([fetchMyTransactions(1, 20, txFilter.value), fetchMyLimits(), loadWithdrawals()])
}
async function handleCreate() { await createMyWallet('USD'); await fetchMyTransactions() }

onMounted(reload)
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px); }
</style>
