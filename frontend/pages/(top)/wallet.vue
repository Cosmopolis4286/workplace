<template>
  <div>
    <PageHeader
      title="Billetera"
      description="Gestiona tu saldo y movimientos digitales"
      :icon="WalletIcon"
      :breadcrumb="[{ label: 'Billetera' }]"
      :stats="headerStats"
    >
      <template #actions>
        <HeaderActionButton v-if="!wallet && !loading" variant="primary" :icon="PlusIcon" @click="handleCreate">
          Crear billetera
        </HeaderActionButton>
        <template v-if="wallet && wallet.status === 'ACTIVE'">
          <HeaderActionButton variant="primary" :icon="ArrowDownTrayIcon" @click="openModal('deposit')">
            Depositar
          </HeaderActionButton>
          <HeaderActionButton :icon="ArrowUpTrayIcon" @click="openModal('withdraw')">
            Retirar
          </HeaderActionButton>
          <HeaderActionButton :icon="ArrowsRightLeftIcon" @click="openModal('transfer')">
            Transferir
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
          @create="handleCreate"
        />

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

        <WalletWithdrawalsList
          v-if="wallet"
          :withdrawals="withdrawals"
          :format-money="formatMoney"
          :format-date-time="formatDateTime"
        />

        <SellerPaymentAccountsCard v-if="wallet" scope="payout" @saved="onAccountsSaved" />
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
      ref="modalsRef"
      :active-modal="activeModal"
      :wallet="wallet"
      :loading="loading"
      :modal-error="modalError"
      :format-money="formatMoney"
      :payout-accounts="payoutAccounts"
      @close="closeModal"
      @deposit-request="handleDepositRequest"
      @withdraw="handleWithdraw"
      @transfer="handleTransfer"
      @pin-submit="handlePin"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
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
import WalletWithdrawalsList from '~/components/wallet/WalletWithdrawalsList.vue'
import SellerPaymentAccountsCard from '~/components/settings/SellerPaymentAccountsCard.vue'
import { useWalletWithdrawals, type WalletWithdrawal } from '~/composables/wallets/useWalletWithdrawals'
import { useDirectPayments, type SellerPaymentAccount } from '~/composables/payments/useDirectPayments'
import { useWallets, type WalletTransactionType } from '~/composables/wallets/useWallets'
import { useWalletDepositRequests } from '~/composables/wallets/useWalletDepositRequests'
import { useDateFormat } from '~/composables/core/useDateFormat'
import { getApiErrorMessage } from '~/composables/core/useApiErrors'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const { formatDate: fmtDate, formatDateTime: fmtDateTime } = useDateFormat()
const {
  wallet, transactions, transactionsMeta, limitsStatus,
  loading, loadingTx, error,
  fetchMyWallet, createMyWallet, fetchMyTransactions, fetchMyLimits,
  setPin, changePin,
  withdraw, transfer,
  formatMoney,
  STATUS_LABELS, STATUS_CLASSES, TYPE_LABELS, TYPE_CLASSES,
} = useWallets()

const { create: createDepositRequest } = useWalletDepositRequests()
const withdrawalsApi = useWalletWithdrawals()
const directPayments = useDirectPayments()
const withdrawals = ref<WalletWithdrawal[]>([])
const payoutAccounts = ref<SellerPaymentAccount[]>([])

async function loadWithdrawals() {
  try { withdrawals.value = await withdrawalsApi.listMine() } catch { withdrawals.value = [] }
}
async function loadPayoutAccounts() {
  try {
    payoutAccounts.value = (await directPayments.listMyAccounts()).filter(a => a.isActive)
  } catch { payoutAccounts.value = [] }
}
function onAccountsSaved(message: string) {
  showToast('success', message)
  loadPayoutAccounts()
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
type ModalType = 'deposit' | 'withdraw' | 'transfer' | 'pin'
const activeModal = ref<ModalType | null>(null)
const modalError  = ref<string | null>(null)
const modalsRef = ref<InstanceType<typeof WalletModals> | null>(null)

function openModal(type: ModalType) {
  activeModal.value = type; modalError.value = null
}
function closeModal() { activeModal.value = null; modalError.value = null }

async function handleDepositRequest(payload: { amount: number; paymentMethod: string; reference: string; proofImage: File }) {
  modalError.value = null
  try {
    await createDepositRequest({
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      reference: payload.reference || undefined,
      proofImage: payload.proofImage,
    })
    closeModal()
    showToast('success', 'Solicitud enviada. Un admin verificará tu comprobante y acreditará el saldo.')
  } catch (e: any) { modalError.value = getApiErrorMessage(e, 'Error al enviar la solicitud') }
}

async function handleWithdraw(payload: { amount: number; pin: string; description: string; payoutAccountId: string }) {
  modalError.value = null
  try {
    await withdraw({
      amount: payload.amount,
      pin: payload.pin,
      description: payload.description || undefined,
      payoutAccountId: payload.payoutAccountId,
    })
    await loadWithdrawals()
    closeModal(); showToast('success', `Retiro de ${formatMoney(payload.amount, wallet.value?.currency)} solicitado. Te avisaremos cuando se transfiera.`)
  } catch (e: any) {
    modalError.value = e?.message ?? 'Error al retirar'
    modalsRef.value?.resetConfirm()
  }
}

async function handleTransfer(payload: { recipientUserId: string; amount: number; pin: string; description: string }) {
  modalError.value = null
  try {
    await transfer({ recipientUserId: payload.recipientUserId, amount: payload.amount, pin: payload.pin, description: payload.description || undefined })
    closeModal(); showToast('success', `Transferencia de ${formatMoney(payload.amount, wallet.value?.currency)} enviada`)
  } catch (e: any) {
    modalError.value = e?.message ?? 'Error al transferir'
    modalsRef.value?.resetConfirm()
  }
}

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
  if (w) await Promise.allSettled([fetchMyTransactions(1, 20, txFilter.value), fetchMyLimits(), loadWithdrawals(), loadPayoutAccounts()])
}
async function handleCreate() { await createMyWallet('USD'); await fetchMyTransactions() }

onMounted(reload)
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(-12px); }
</style>
