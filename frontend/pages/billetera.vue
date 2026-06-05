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
        <button
          v-if="!wallet && !loading"
          class="btn-primary flex items-center gap-2"
          @click="handleCreate"
        >
          <PlusIcon class="h-5 w-5" />
          Crear billetera
        </button>
        <template v-if="wallet">
          <button class="btn-primary flex items-center gap-2" @click="openModal('deposit')">
            <ArrowDownTrayIcon class="h-4 w-4" />
            Depositar
          </button>
          <button class="btn-secondary flex items-center gap-2" @click="openModal('withdraw')">
            <ArrowUpTrayIcon class="h-4 w-4" />
            Retirar
          </button>
          <button class="btn-secondary flex items-center gap-2" @click="openModal('transfer')">
            <ArrowsRightLeftIcon class="h-4 w-4" />
            Transferir
          </button>
        </template>
        <button class="btn-secondary flex items-center gap-2" :disabled="loading" @click="reload">
          <ArrowPathIcon class="h-4 w-4" :class="{ 'animate-spin': loading }" />
          Actualizar
        </button>
      </template>
    </PageHeader>

    <!-- Error banner -->
    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
      <p class="text-red-700 text-sm">{{ error }}</p>
      <button class="text-red-500 hover:text-red-700" @click="reload">
        <ArrowPathIcon class="h-4 w-4" />
      </button>
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
      <!-- ── Main column ────────────────────────────────────────────────── -->
      <section class="lg:col-span-2 space-y-6">

        <!-- Loading skeleton -->
        <div v-if="loading && !wallet" class="card p-6 animate-pulse space-y-4">
          <div class="skeleton h-4 w-28 rounded" />
          <div class="skeleton h-12 w-56 rounded" />
          <div class="skeleton h-20 rounded-xl" />
        </div>

        <!-- Wallet card -->
        <div v-else-if="wallet" class="card overflow-hidden">
          <div class="p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 text-white relative overflow-hidden">
            <!-- decorative circles -->
            <div class="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
            <div class="absolute -right-4 top-12 w-24 h-24 bg-white/5 rounded-full" />

            <div class="relative flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-widest text-white/60 font-bold">Saldo disponible</p>
                <p class="text-4xl font-black mt-2 tabular-nums">
                  {{ formatMoney(wallet.balance, wallet.currency) }}
                </p>
              </div>
              <span
                class="px-3 py-1 rounded-full text-xs font-bold"
                :class="STATUS_CLASSES[wallet.status]"
              >
                {{ STATUS_LABELS[wallet.status] }}
              </span>
            </div>

            <div class="relative mt-8 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p class="text-white/50 text-xs">Moneda</p>
                <p class="font-semibold">{{ wallet.currency }}</p>
              </div>
              <div>
                <p class="text-white/50 text-xs">Movimientos</p>
                <p class="font-semibold">{{ wallet._count?.transactions ?? 0 }}</p>
              </div>
              <div>
                <p class="text-white/50 text-xs">Creada</p>
                <p class="font-semibold">{{ formatDate(wallet.createdAt) }}</p>
              </div>
            </div>

            <!-- Quick actions row -->
            <div class="relative mt-6 flex gap-3 flex-wrap">
              <button
                class="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors"
                @click="openModal('deposit')"
              >
                <ArrowDownTrayIcon class="h-4 w-4" />
                Depositar
              </button>
              <button
                class="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors"
                @click="openModal('withdraw')"
              >
                <ArrowUpTrayIcon class="h-4 w-4" />
                Retirar
              </button>
              <button
                class="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors"
                @click="openModal('transfer')"
              >
                <ArrowsRightLeftIcon class="h-4 w-4" />
                Transferir
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-else class="card p-10 text-center border-2 border-dashed border-gray-200">
          <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <WalletIcon class="h-7 w-7 text-workplace-red" />
          </div>
          <h3 class="text-base font-semibold text-gray-900 mb-1">Todavía no tienes billetera</h3>
          <p class="text-sm text-gray-500 mb-5">
            Crea una wallet para habilitar saldo y movimientos asociados a tu cuenta.
          </p>
          <button class="btn-primary inline-flex items-center gap-2" @click="handleCreate">
            <PlusIcon class="h-5 w-5" />
            Crear mi billetera
          </button>
        </div>

        <!-- ── Transactions ───────────────────────────────────────────── -->
        <div class="card overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 class="text-base font-bold text-gray-900">Movimientos</h2>
              <p class="text-xs text-gray-400">
                {{ transactionsMeta.total }} transacciones en total
              </p>
            </div>
            <!-- Filter tabs -->
            <div class="flex gap-1 bg-gray-100 rounded-lg p-1 text-xs">
              <button
                v-for="f in txFilters"
                :key="f.value ?? 'all'"
                class="px-3 py-1.5 rounded-md font-medium transition-colors"
                :class="txFilter === f.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'"
                @click="setTxFilter(f.value)"
              >
                {{ f.label }}
              </button>
            </div>
          </div>

          <div v-if="loadingTx" class="p-6 space-y-3">
            <div v-for="i in 4" :key="i" class="animate-pulse flex gap-3 items-center">
              <div class="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
              <div class="flex-1 space-y-2">
                <div class="skeleton h-3 w-40 rounded" />
                <div class="skeleton h-3 w-24 rounded" />
              </div>
              <div class="skeleton h-4 w-20 rounded" />
            </div>
          </div>

          <div v-else-if="transactions.length === 0" class="p-10 text-center">
            <ArrowsRightLeftIcon class="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p class="text-sm font-medium text-gray-600">Sin movimientos</p>
            <p class="text-xs text-gray-400 mt-1">Los créditos, débitos y ajustes aparecerán aquí.</p>
          </div>

          <div v-else class="divide-y divide-gray-100">
            <div
              v-for="tx in transactions"
              :key="tx.id"
              class="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
            >
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                :class="TYPE_CLASSES[tx.type]"
              >
                <ArrowDownIcon v-if="tx.type === 'CREDIT'" class="h-5 w-5" />
                <ArrowUpIcon v-else-if="tx.type === 'DEBIT'" class="h-5 w-5" />
                <AdjustmentsHorizontalIcon v-else class="h-5 w-5" />
              </div>

              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-gray-900 truncate">
                  {{ tx.description || TYPE_LABELS[tx.type] }}
                </p>
                <div class="flex items-center gap-2 mt-0.5">
                  <p class="text-xs text-gray-400">{{ formatDateTime(tx.createdAt) }}</p>
                  <span
                    v-if="tx.reference"
                    class="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[120px]"
                    :title="tx.reference"
                  >
                    {{ tx.reference }}
                  </span>
                </div>
              </div>

              <div class="text-right flex-shrink-0">
                <p
                  class="text-sm font-bold tabular-nums"
                  :class="tx.type === 'DEBIT' ? 'text-red-600' : tx.type === 'CREDIT' ? 'text-green-600' : 'text-gray-700'"
                >
                  {{ tx.type === 'DEBIT' ? '-' : '+' }}{{ formatMoney(tx.amount, wallet?.currency ?? 'USD') }}
                </p>
                <p class="text-xs text-gray-400 tabular-nums">
                  {{ formatMoney(tx.balanceAfter, wallet?.currency ?? 'USD') }}
                </p>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div
            v-if="transactionsMeta.totalPages > 1"
            class="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm"
          >
            <span class="text-gray-500 text-xs">
              Página {{ transactionsMeta.page }} de {{ transactionsMeta.totalPages }}
            </span>
            <div class="flex gap-2">
              <button
                class="btn-secondary text-xs px-3 py-1.5"
                :disabled="transactionsMeta.page <= 1"
                @click="goTxPage(transactionsMeta.page - 1)"
              >
                Anterior
              </button>
              <button
                class="btn-secondary text-xs px-3 py-1.5"
                :disabled="transactionsMeta.page >= transactionsMeta.totalPages"
                @click="goTxPage(transactionsMeta.page + 1)"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Sidebar ─────────────────────────────────────────────────────── -->
      <aside class="space-y-4">
        <!-- Details card -->
        <div class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Detalles</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between gap-4">
              <span class="text-gray-500">Estado</span>
              <span class="font-semibold text-gray-900">
                {{ wallet ? STATUS_LABELS[wallet.status] : 'Sin billetera' }}
              </span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-gray-500">Movimientos</span>
              <span class="font-semibold text-gray-900">{{ wallet?._count?.transactions ?? 0 }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-gray-500">Moneda</span>
              <span class="font-semibold text-gray-900">{{ wallet?.currency ?? '—' }}</span>
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-gray-500">ID billetera</span>
              <span class="font-mono text-xs text-gray-400 break-all">{{ wallet?.id ?? '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Quick stats card (only when there are transactions) -->
        <div v-if="transactions.length > 0" class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Resumen reciente</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between gap-4">
              <span class="text-gray-500 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Créditos
              </span>
              <span class="font-semibold text-green-700 tabular-nums">
                {{ formatMoney(creditTotal, wallet?.currency ?? 'USD') }}
              </span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-gray-500 flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-red-500 inline-block" />
                Débitos
              </span>
              <span class="font-semibold text-red-700 tabular-nums">
                {{ formatMoney(debitTotal, wallet?.currency ?? 'USD') }}
              </span>
            </div>
          </div>
        </div>

        <!-- Admin panel -->
        <div v-if="isAdmin" class="card p-5">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">Administración</h3>
          <p class="text-xs text-gray-500 mb-3">
            Gestiona wallets de otros usuarios via API o ajusta el saldo manualmente.
          </p>
          <div class="space-y-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-xl p-3 font-mono">
            <p>GET  /wallets</p>
            <p>POST /wallets/users/:id</p>
            <p>POST /wallets/users/:id/adjust</p>
          </div>
        </div>
      </aside>
    </div>

    <!-- ── Modals ───────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="activeModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          @click.self="closeModal"
        >
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              @click="closeModal"
            >
              <XMarkIcon class="h-5 w-5" />
            </button>

            <!-- Deposit modal -->
            <template v-if="activeModal === 'deposit'">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <ArrowDownTrayIcon class="h-5 w-5 text-green-700" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-gray-900">Depositar fondos</h3>
                  <p class="text-xs text-gray-500">Agrega saldo a tu billetera</p>
                </div>
              </div>
              <form class="space-y-4" @submit.prevent="handleDeposit">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      {{ wallet?.currency ?? 'USD' }}
                    </span>
                    <input
                      v-model.number="form.amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      class="input pl-14"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input v-model="form.description" type="text" class="input" placeholder="Ej. Recarga de saldo" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Referencia</label>
                  <input v-model="form.reference" type="text" class="input" placeholder="Ej. TRX-123456" />
                </div>
                <p v-if="modalError" class="text-sm text-red-600">{{ modalError }}</p>
                <div class="flex gap-3 pt-2">
                  <button type="button" class="btn-secondary flex-1" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary flex-1" :disabled="loading">
                    <span v-if="loading" class="flex items-center justify-center gap-2">
                      <ArrowPathIcon class="h-4 w-4 animate-spin" />Procesando
                    </span>
                    <span v-else>Depositar</span>
                  </button>
                </div>
              </form>
            </template>

            <!-- Withdraw modal -->
            <template v-else-if="activeModal === 'withdraw'">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <ArrowUpTrayIcon class="h-5 w-5 text-red-700" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-gray-900">Retirar fondos</h3>
                  <p class="text-xs text-gray-500">
                    Saldo disponible: <strong>{{ formatMoney(wallet?.balance ?? 0, wallet?.currency) }}</strong>
                  </p>
                </div>
              </div>
              <form class="space-y-4" @submit.prevent="handleWithdraw">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      {{ wallet?.currency ?? 'USD' }}
                    </span>
                    <input
                      v-model.number="form.amount"
                      type="number"
                      min="0.01"
                      :max="wallet?.balance"
                      step="0.01"
                      class="input pl-14"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input v-model="form.description" type="text" class="input" placeholder="Ej. Retiro a cuenta bancaria" />
                </div>
                <p v-if="modalError" class="text-sm text-red-600">{{ modalError }}</p>
                <div class="flex gap-3 pt-2">
                  <button type="button" class="btn-secondary flex-1" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary flex-1" :disabled="loading">
                    <span v-if="loading" class="flex items-center justify-center gap-2">
                      <ArrowPathIcon class="h-4 w-4 animate-spin" />Procesando
                    </span>
                    <span v-else>Retirar</span>
                  </button>
                </div>
              </form>
            </template>

            <!-- Transfer modal -->
            <template v-else-if="activeModal === 'transfer'">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <ArrowsRightLeftIcon class="h-5 w-5 text-blue-700" />
                </div>
                <div>
                  <h3 class="text-base font-bold text-gray-900">Transferir fondos</h3>
                  <p class="text-xs text-gray-500">
                    Disponible: <strong>{{ formatMoney(wallet?.balance ?? 0, wallet?.currency) }}</strong>
                  </p>
                </div>
              </div>
              <form class="space-y-4" @submit.prevent="handleTransfer">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">ID del destinatario *</label>
                  <input
                    v-model="form.recipientUserId"
                    type="text"
                    class="input font-mono text-sm"
                    placeholder="UUID del usuario"
                    required
                  />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <div class="relative">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                      {{ wallet?.currency ?? 'USD' }}
                    </span>
                    <input
                      v-model.number="form.amount"
                      type="number"
                      min="0.01"
                      :max="wallet?.balance"
                      step="0.01"
                      class="input pl-14"
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <input v-model="form.description" type="text" class="input" placeholder="Motivo de la transferencia" />
                </div>
                <p v-if="modalError" class="text-sm text-red-600">{{ modalError }}</p>
                <div class="flex gap-3 pt-2">
                  <button type="button" class="btn-secondary flex-1" @click="closeModal">Cancelar</button>
                  <button type="submit" class="btn-primary flex-1" :disabled="loading">
                    <span v-if="loading" class="flex items-center justify-center gap-2">
                      <ArrowPathIcon class="h-4 w-4 animate-spin" />Enviando
                    </span>
                    <span v-else>Transferir</span>
                  </button>
                </div>
              </form>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  AdjustmentsHorizontalIcon,
  ArrowDownIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ArrowUpTrayIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  PlusIcon,
  WalletIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import PageHeader from '~/components/ui/PageHeader.vue'
import { useWallets, type WalletTransactionType } from '~/composables/useWallets'

definePageMeta({ layout: 'default', middleware: ['auth'] })

const { user } = useAuth()
const {
  wallet,
  transactions,
  transactionsMeta,
  loading,
  loadingTx,
  error,
  fetchMyWallet,
  createMyWallet,
  fetchMyTransactions,
  deposit,
  withdraw,
  transfer,
  formatMoney,
  STATUS_LABELS,
  STATUS_CLASSES,
  TYPE_LABELS,
  TYPE_CLASSES,
} = useWallets()

const isAdmin = computed(() => ['SUPERADMIN', 'ADMIN'].includes(user.value?.role ?? ''))

// ── Filters ────────────────────────────────────────────────────────────────────
const txFilters: { label: string; value: WalletTransactionType | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Créditos', value: 'CREDIT' },
  { label: 'Débitos', value: 'DEBIT' },
  { label: 'Ajustes', value: 'ADJUSTMENT' },
]
const txFilter = ref<WalletTransactionType | undefined>(undefined)

async function setTxFilter(f: WalletTransactionType | undefined) {
  txFilter.value = f
  await fetchMyTransactions(1, 20, f)
}

async function goTxPage(page: number) {
  await fetchMyTransactions(page, 20, txFilter.value)
}

// ── Quick stats ────────────────────────────────────────────────────────────────
const creditTotal = computed(() =>
  transactions.value.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0)
)
const debitTotal = computed(() =>
  transactions.value.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0)
)

// ── Header stats ───────────────────────────────────────────────────────────────
const headerStats = computed(() =>
  wallet.value
    ? [
        { label: 'Saldo', value: formatMoney(wallet.value.balance, wallet.value.currency) },
        { label: 'Moneda', value: wallet.value.currency },
        { label: 'Estado', value: STATUS_LABELS[wallet.value.status] },
        { label: 'Movimientos', value: String(wallet.value._count?.transactions ?? 0) },
      ]
    : [{ label: 'Estado', value: 'Sin billetera' }]
)

// ── Date helpers ───────────────────────────────────────────────────────────────
function formatDate(date: string) {
  return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Toast ──────────────────────────────────────────────────────────────────────
const toast = ref<{ type: 'success' | 'error'; message: string } | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(type: 'success' | 'error', message: string) {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { type, message }
  toastTimer = setTimeout(() => { toast.value = null }, 3500)
}

// ── Modal ──────────────────────────────────────────────────────────────────────
type ModalType = 'deposit' | 'withdraw' | 'transfer'
const activeModal = ref<ModalType | null>(null)
const modalError = ref<string | null>(null)

const form = ref({
  amount: undefined as number | undefined,
  description: '',
  reference: '',
  recipientUserId: '',
})

function openModal(type: ModalType) {
  activeModal.value = type
  modalError.value = null
  form.value = { amount: undefined, description: '', reference: '', recipientUserId: '' }
}

function closeModal() {
  activeModal.value = null
  modalError.value = null
}

async function handleDeposit() {
  if (!form.value.amount) return
  modalError.value = null
  try {
    await deposit({
      amount: form.value.amount,
      description: form.value.description || undefined,
      reference: form.value.reference || undefined,
    })
    closeModal()
    showToast('success', `Depósito de ${formatMoney(form.value.amount, wallet.value?.currency)} realizado`)
  } catch (e: any) {
    modalError.value = e?.message ?? 'Error al depositar'
  }
}

async function handleWithdraw() {
  if (!form.value.amount) return
  modalError.value = null
  try {
    await withdraw({
      amount: form.value.amount,
      description: form.value.description || undefined,
      reference: form.value.reference || undefined,
    })
    closeModal()
    showToast('success', `Retiro de ${formatMoney(form.value.amount, wallet.value?.currency)} realizado`)
  } catch (e: any) {
    modalError.value = e?.message ?? 'Error al retirar'
  }
}

async function handleTransfer() {
  if (!form.value.amount || !form.value.recipientUserId) return
  modalError.value = null
  try {
    await transfer({
      recipientUserId: form.value.recipientUserId,
      amount: form.value.amount,
      description: form.value.description || undefined,
    })
    closeModal()
    showToast('success', `Transferencia de ${formatMoney(form.value.amount, wallet.value?.currency)} enviada`)
  } catch (e: any) {
    modalError.value = e?.message ?? 'Error al transferir'
  }
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────
async function reload() {
  const w = await fetchMyWallet()
  if (w) await fetchMyTransactions(1, 20, txFilter.value)
}

async function handleCreate() {
  await createMyWallet('USD')
  await fetchMyTransactions()
}

onMounted(reload)
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-12px);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .bg-white,
.modal-leave-to .bg-white {
  transform: scale(0.95);
}
</style>
