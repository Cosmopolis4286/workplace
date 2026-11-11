import { computed, ref } from 'vue'

export type WalletStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED'
export type WalletTransactionType = 'CREDIT' | 'DEBIT' | 'ADJUSTMENT'
export type WalletTransactionStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface WalletUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export interface Wallet {
  id: string
  userId: string
  currency: string
  balance: number
  status: WalletStatus
  hasPin: boolean
  frozenAt?: string | null
  frozenBy?: string | null
  createdAt: string
  updatedAt: string
  user?: WalletUser
  _count?: { transactions: number }
}

export interface WalletTransaction {
  id: string
  walletId: string
  userId: string
  type: WalletTransactionType
  status: WalletTransactionStatus
  amount: number
  balanceAfter: number
  description?: string
  reference?: string
  metadata?: Record<string, any>
  createdAt: string
}

export interface WalletLimitsStatus {
  limits: {
    maxSingleTx: number
    dailyDebit: number
    monthlyDebit: number
    maxBalance: number
    dailyTransfers: number
  }
  used: { dailyDebit: number; monthlyDebit: number; dailyTransfers: number }
  remaining: { dailyDebit: number; monthlyDebit: number; dailyTransfers: number }
}

interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface EscrowReconciliation {
  systemWalletBalance: number
  heldTotal: number
  heldCount: number
  retainedFeesTotal: number
  expectedBalance: number
  pendingFundsTotal: number
  pendingFundsCount: number
  discrepancy: number
  isBalanced: boolean
}

export interface DepositPayload {
  amount: number
  description?: string
  reference?: string
  idempotencyKey?: string
  metadata?: Record<string, any>
}

// Prefixed to avoid Nuxt auto-import collisions with other composables
const WALLET_STATUS_LABELS: Record<WalletStatus, string> = {
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  CLOSED: 'Cerrada',
}

const WALLET_STATUS_CLASSES: Record<WalletStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-red-100 text-red-700',
}

const WALLET_TYPE_LABELS: Record<WalletTransactionType, string> = {
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  ADJUSTMENT: 'Ajuste',
}

const WALLET_TYPE_CLASSES: Record<WalletTransactionType, string> = {
  CREDIT: 'bg-green-100 text-green-700',
  DEBIT: 'bg-red-100 text-red-700',
  ADJUSTMENT: 'bg-gray-100 text-gray-700',
}

// Module-level singleton state — intentional: billetera.vue relies on
// shared reactivity across components. MUST be cleared on logout via resetWallets().
const wallet = ref<Wallet | null>(null)
const transactions = ref<WalletTransaction[]>([])
const transactionsMeta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 })
const wallets = ref<Wallet[]>([])
const limitsStatus = ref<WalletLimitsStatus | null>(null)
const loading = ref(false)
const loadingTx = ref(false)
const error = ref<string | null>(null)

export function resetWallets() {
  wallet.value = null
  transactions.value = []
  transactionsMeta.value = { total: 0, page: 1, limit: 20, totalPages: 1 }
  wallets.value = []
  limitsStatus.value = null
  loading.value = false
  loadingTx.value = false
  error.value = null
}

export function useWallets() {
  const { get, post, patch, del } = useApi()

  async function fetchMyWallet() {
    loading.value = true
    error.value = null
    try {
      wallet.value = await get<Wallet>('/wallets/me')
      return wallet.value
    } catch (e: any) {
      if (e?.statusCode === 404) { wallet.value = null; return null }
      error.value = e?.message ?? 'No se pudo cargar la billetera'
      return null
    } finally {
      loading.value = false
    }
  }

  async function createMyWallet(currency = 'USD') {
    loading.value = true
    error.value = null
    try {
      wallet.value = await post<Wallet>('/wallets/me', { currency })
      return wallet.value
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudo crear la billetera'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchMyTransactions(page = 1, limit = 20, type?: WalletTransactionType) {
    loadingTx.value = true
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (type) params.set('type', type)
      const res = await get<Paginated<WalletTransaction>>(`/wallets/me/transactions?${params}`)
      transactions.value = res.data
      transactionsMeta.value = { total: res.total, page: res.page, limit: res.limit, totalPages: res.totalPages }
      return res
    } finally {
      loadingTx.value = false
    }
  }

  async function fetchMyLimits() {
    try {
      limitsStatus.value = await get<WalletLimitsStatus>('/wallets/me/limits')
      return limitsStatus.value
    } catch { return null }
  }

  // ─── PIN management ──────────────────────────────────────────────────────────

  async function setPin(pin: string) {
    const result = await post<{ message: string }>('/wallets/me/pin', { pin })
    if (wallet.value) wallet.value = { ...wallet.value, hasPin: true }
    return result
  }

  async function changePin(currentPin: string, newPin: string) {
    return patch<{ message: string }>('/wallets/me/pin', { currentPin, newPin })
  }

  async function removePin(pin: string) {
    const result = await del<{ message: string }>('/wallets/me/pin', { pin })
    if (wallet.value) wallet.value = { ...wallet.value, hasPin: false }
    return result
  }

  // ─── Financial operations ────────────────────────────────────────────────────
  // La billetera solo se retira (useWalletWithdrawals): ya no se recarga ni
  // transfiere/paga entre usuarios. Pago Protegido se paga por operación
  // (useEscrowFunding).

  async function fetchWallets(page = 1, limit = 20) {
    const res = await get<Paginated<Wallet>>(`/wallets?page=${page}&limit=${limit}`)
    wallets.value = res.data
    return res
  }

  async function fetchEscrowReconciliation() {
    return get<EscrowReconciliation>('/wallets/escrow-reconciliation')
  }

  async function createUserWallet(userId: string, currency = 'USD') {
    return post<Wallet>(`/wallets/users/${userId}`, { currency })
  }

  async function fetchUserWallet(userId: string) {
    return get<Wallet>(`/wallets/users/${userId}`)
  }

  async function fetchUserTransactions(userId: string, page = 1, limit = 20) {
    return get<Paginated<WalletTransaction>>(`/wallets/users/${userId}/transactions?page=${page}&limit=${limit}`)
  }

  async function adjustUserBalance(userId: string, type: 'CREDIT' | 'DEBIT', amount: number, description?: string) {
    return post<{ wallet: Wallet; transaction: WalletTransaction }>(`/wallets/users/${userId}/adjust`, { type, amount, description })
  }

  async function freezeUserWallet(userId: string) {
    return post<Wallet>(`/wallets/users/${userId}/freeze`, {})
  }

  async function unfreezeUserWallet(userId: string) {
    return post<Wallet>(`/wallets/users/${userId}/unfreeze`, {})
  }

  function formatMoney(amount: number, currency = wallet.value?.currency ?? 'USD') {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency', currency, minimumFractionDigits: 2,
    }).format(amount)
  }

  return {
    wallet: computed(() => wallet.value),
    wallets: computed(() => wallets.value),
    transactions: computed(() => transactions.value),
    transactionsMeta: computed(() => transactionsMeta.value),
    limitsStatus: computed(() => limitsStatus.value),
    loading: computed(() => loading.value),
    loadingTx: computed(() => loadingTx.value),
    error: computed(() => error.value),
    fetchMyWallet,
    createMyWallet,
    fetchMyTransactions,
    fetchMyLimits,
    setPin,
    changePin,
    removePin,
    fetchWallets,
    fetchEscrowReconciliation,
    createUserWallet,
    fetchUserWallet,
    fetchUserTransactions,
    adjustUserBalance,
    freezeUserWallet,
    unfreezeUserWallet,
    formatMoney,
    STATUS_LABELS: WALLET_STATUS_LABELS,
    STATUS_CLASSES: WALLET_STATUS_CLASSES,
    TYPE_LABELS: WALLET_TYPE_LABELS,
    TYPE_CLASSES: WALLET_TYPE_CLASSES,
  }
}
