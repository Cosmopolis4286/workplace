import { ref } from 'vue'
import { useApi } from '../core/useApi'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AccountStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface Receivable {
  id: string
  description: string
  amount: number
  currencyCode: string
  exchangeRateValue: number
  amountUsd: number
  dueDate?: string | null
  status: AccountStatus
  paidAt?: string | null
  customerId?: string | null
  customer?: { id: string; name: string } | null
  orderId?: string | null
  createdAt: string
}

export interface Payable {
  id: string
  description: string
  amount: number
  currencyCode: string
  exchangeRateValue: number
  amountUsd: number
  dueDate?: string | null
  status: AccountStatus
  paidAt?: string | null
  supplierId?: string | null
  supplier?: { id: string; name: string } | null
  purchaseId?: string | null
  createdAt: string
}

export interface ReplacementRisk {
  id: string
  currencyCode: string
  hasExposure: boolean
  message?: string
  originalRate?: number
  currentRate?: number
  rateChangePct?: number
  originalAmountUsd?: number
  currentAmountUsd?: number
  valueLossUsd?: number
}

export interface CreateReceivablePayload {
  description: string
  amount: number
  currencyCode: string
  customerId?: string
  orderId?: string
  dueDate?: string
}

export interface CreatePayablePayload {
  description: string
  amount: number
  currencyCode: string
  supplierId?: string
  purchaseId?: string
  dueDate?: string
}

// ─── Global reactive state ────────────────────────────────────────────────────

const receivables = ref<Receivable[]>([])
const payables = ref<Payable[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// ─── Composable ───────────────────────────────────────────────────────────────

export function useAccounts() {
  const { get, post, patch, del } = useApi()

  async function loadReceivables(status?: AccountStatus) {
    loading.value = true
    error.value = null
    try {
      const qs = status ? `?status=${status}` : ''
      receivables.value = await get<Receivable[]>(`/accounts/receivables${qs}`)
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function loadPayables(status?: AccountStatus) {
    loading.value = true
    error.value = null
    try {
      const qs = status ? `?status=${status}` : ''
      payables.value = await get<Payable[]>(`/accounts/payables${qs}`)
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function createReceivable(payload: CreateReceivablePayload): Promise<Receivable | null> {
    error.value = null
    try {
      const receivable = await post<Receivable>('/accounts/receivables', payload)
      receivables.value.unshift(receivable)
      return receivable
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function createPayable(payload: CreatePayablePayload): Promise<Payable | null> {
    error.value = null
    try {
      const payable = await post<Payable>('/accounts/payables', payload)
      payables.value.unshift(payable)
      return payable
    } catch (e: any) {
      error.value = e?.message
      return null
    }
  }

  async function markReceivableAsPaid(id: string): Promise<boolean> {
    try {
      const updated = await patch<Receivable>(`/accounts/receivables/${id}/paid`, {})
      const idx = receivables.value.findIndex(r => r.id === id)
      if (idx !== -1) receivables.value[idx] = updated
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function markPayableAsPaid(id: string): Promise<boolean> {
    try {
      const updated = await patch<Payable>(`/accounts/payables/${id}/paid`, {})
      const idx = payables.value.findIndex(p => p.id === id)
      if (idx !== -1) payables.value[idx] = updated
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function deleteReceivable(id: string): Promise<boolean> {
    try {
      await del(`/accounts/receivables/${id}`)
      receivables.value = receivables.value.filter(r => r.id !== id)
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function deletePayable(id: string): Promise<boolean> {
    try {
      await del(`/accounts/payables/${id}`)
      payables.value = payables.value.filter(p => p.id !== id)
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    }
  }

  async function getReplacementRisk(id: string): Promise<ReplacementRisk | null> {
    try {
      return await get<ReplacementRisk>(`/accounts/receivables/${id}/replacement-risk`)
    } catch {
      return null
    }
  }

  return {
    // state
    receivables,
    payables,
    loading,
    error,
    // actions
    loadReceivables,
    loadPayables,
    createReceivable,
    createPayable,
    markReceivableAsPaid,
    markPayableAsPaid,
    deleteReceivable,
    deletePayable,
    getReplacementRisk,
  }
}
