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

interface Paginated<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DepositPayload {
  amount: number
  description?: string
  reference?: string
  metadata?: Record<string, any>
}

export interface WithdrawPayload {
  amount: number
  description?: string
  reference?: string
  metadata?: Record<string, any>
}

export interface TransferPayload {
  recipientUserId: string
  amount: number
  description?: string
}

export interface PaymentPayload {
  amount: number
  orderId?: string
  serviceRequestId?: string
  description?: string
}

export const STATUS_LABELS: Record<WalletStatus, string> = {
  ACTIVE: 'Activa',
  SUSPENDED: 'Suspendida',
  CLOSED: 'Cerrada',
}

export const STATUS_CLASSES: Record<WalletStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-red-100 text-red-700',
}

export const TYPE_LABELS: Record<WalletTransactionType, string> = {
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
  ADJUSTMENT: 'Ajuste',
}

export const TYPE_CLASSES: Record<WalletTransactionType, string> = {
  CREDIT: 'bg-green-100 text-green-700',
  DEBIT: 'bg-red-100 text-red-700',
  ADJUSTMENT: 'bg-gray-100 text-gray-700',
}

// Module-level singleton state
const wallet = ref<Wallet | null>(null)
const transactions = ref<WalletTransaction[]>([])
const transactionsMeta = ref({ total: 0, page: 1, limit: 20, totalPages: 1 })
const wallets = ref<Wallet[]>([])
const loading = ref(false)
const loadingTx = ref(false)
const error = ref<string | null>(null)

export function useWallets() {
  const { get, post } = useApi()

  async function fetchMyWallet() {
    loading.value = true
    error.value = null
    try {
      wallet.value = await get<Wallet>('/wallets/me')
      return wallet.value
    } catch (e: any) {
      if (e?.statusCode === 404) {
        wallet.value = null
        return null
      }
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

  async function deposit(payload: DepositPayload) {
    loading.value = true
    error.value = null
    try {
      const result = await post<{ wallet: Wallet; transaction: WalletTransaction }>('/wallets/me/deposit', payload)
      wallet.value = { ...wallet.value!, ...result.wallet }
      transactions.value = [result.transaction, ...transactions.value]
      transactionsMeta.value.total++
      return result
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudo realizar el depósito'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function withdraw(payload: WithdrawPayload) {
    loading.value = true
    error.value = null
    try {
      const result = await post<{ wallet: Wallet; transaction: WalletTransaction }>('/wallets/me/withdraw', payload)
      wallet.value = { ...wallet.value!, ...result.wallet }
      transactions.value = [result.transaction, ...transactions.value]
      transactionsMeta.value.total++
      return result
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudo realizar el retiro'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function transfer(payload: TransferPayload) {
    loading.value = true
    error.value = null
    try {
      const result = await post<{
        reference: string
        sender: { wallet: Wallet; transaction: WalletTransaction }
        recipient: { wallet: Wallet; transaction: WalletTransaction }
      }>('/wallets/me/transfer', payload)
      wallet.value = { ...wallet.value!, ...result.sender.wallet }
      transactions.value = [result.sender.transaction, ...transactions.value]
      transactionsMeta.value.total++
      return result
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudo realizar la transferencia'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function payment(payload: PaymentPayload) {
    loading.value = true
    error.value = null
    try {
      const result = await post<{ wallet: Wallet; transaction: WalletTransaction }>('/wallets/me/payment', payload)
      wallet.value = { ...wallet.value!, ...result.wallet }
      transactions.value = [result.transaction, ...transactions.value]
      transactionsMeta.value.total++
      return result
    } catch (e: any) {
      error.value = e?.message ?? 'No se pudo procesar el pago'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function fetchWallets(page = 1, limit = 20) {
    const res = await get<Paginated<Wallet>>(`/wallets?page=${page}&limit=${limit}`)
    wallets.value = res.data
    return res
  }

  async function createUserWallet(userId: string, currency = 'USD') {
    return post<Wallet>(`/wallets/users/${userId}`, { currency })
  }

  function formatMoney(amount: number, currency = wallet.value?.currency ?? 'USD') {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return {
    wallet: computed(() => wallet.value),
    wallets: computed(() => wallets.value),
    transactions: computed(() => transactions.value),
    transactionsMeta: computed(() => transactionsMeta.value),
    loading: computed(() => loading.value),
    loadingTx: computed(() => loadingTx.value),
    error: computed(() => error.value),
    fetchMyWallet,
    createMyWallet,
    fetchMyTransactions,
    deposit,
    withdraw,
    transfer,
    payment,
    fetchWallets,
    createUserWallet,
    formatMoney,
    STATUS_LABELS,
    STATUS_CLASSES,
    TYPE_LABELS,
    TYPE_CLASSES,
  }
}
