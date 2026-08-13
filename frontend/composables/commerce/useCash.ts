import { ref, computed } from 'vue'
import { useApi } from '../core/useApi'
import { useUserPreferences } from '../users/useUserPreferences'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CashSessionStatus = 'OPEN' | 'CLOSED'
export type CashMovementType = 'INCOME' | 'WITHDRAWAL'

export interface CashMovement {
  id: string
  type: CashMovementType
  amount: number
  reason: string
  sessionId: string
  commerceId: string
  createdAt: string
}

export interface CashSession {
  id: string
  status: CashSessionStatus
  openingAmount: number
  openedAt: string
  openedBy: string
  notes?: string
  countedAmount?: number
  expectedAmount?: number
  difference?: number
  closedAt?: string
  closedBy?: string
  closingNotes?: string
  commerceId: string
  createdAt: string
  updatedAt: string
  movements?: CashMovement[]
}

export interface CashSessionSummary extends CashSession {
  cashSalesTotal: number
  cashSalesCount: number
  manualIncome: number
  manualWithdrawals: number
}

export interface CashSessionFilters {
  status?: CashSessionStatus
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

// ─── Label / style maps ───────────────────────────────────────────────────────

export const CASH_STATUS_LABELS: Record<CashSessionStatus, string> = {
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
}

export const CASH_STATUS_CLASSES: Record<CashSessionStatus, string> = {
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-600',
}

export const CASH_MOVEMENT_TYPE_LABELS: Record<CashMovementType, string> = {
  INCOME: 'Ingreso',
  WITHDRAWAL: 'Retiro',
}

// ─── Global reactive state ────────────────────────────────────────────────────

const current      = ref<CashSessionSummary | null>(null)
const sessions      = ref<CashSession[]>([])
const loading       = ref(false)
const loadingAction = ref(false)
const error         = ref<string | null>(null)
const totalCount    = ref(0)
const currentPage   = ref(1)

// ─── Composable ───────────────────────────────────────────────────────────────

export function useCash() {
  const { get, post } = useApi()

  const { formatCurrency: _fmt } = useUserPreferences()
  function formatCurrency(value: number) { return _fmt.value(value) }

  const isOpen = computed(() => current.value?.status === 'OPEN')

  // ── Current session ───────────────────────────────────────────────────────
  async function loadCurrent() {
    loading.value = true
    error.value   = null
    try {
      current.value = await get<CashSessionSummary | null>('/cash/current')
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  async function openSession(payload: { openingAmount: number; notes?: string }): Promise<boolean> {
    loadingAction.value = true
    error.value = null
    try {
      await post<CashSession>('/cash/open', payload)
      await loadCurrent()
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    } finally {
      loadingAction.value = false
    }
  }

  async function closeSession(payload: { countedAmount: number; closingNotes?: string }): Promise<CashSession | null> {
    loadingAction.value = true
    error.value = null
    try {
      const closed = await post<CashSession>('/cash/close', payload)
      current.value = null
      return closed
    } catch (e: any) {
      error.value = e?.message
      return null
    } finally {
      loadingAction.value = false
    }
  }

  async function addMovement(payload: { type: CashMovementType; amount: number; reason: string }): Promise<boolean> {
    loadingAction.value = true
    error.value = null
    try {
      await post<CashMovement>('/cash/movements', payload)
      await loadCurrent()
      return true
    } catch (e: any) {
      error.value = e?.message
      return false
    } finally {
      loadingAction.value = false
    }
  }

  // ── History ────────────────────────────────────────────────────────────────
  async function loadSessions(filters: CashSessionFilters = {}) {
    loading.value = true
    error.value   = null
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
      })
      const qs  = params.toString()
      const res = await get<{ data: CashSession[]; total: number; page: number }>(`/cash/sessions${qs ? '?' + qs : ''}`)
      sessions.value     = res.data
      totalCount.value   = res.total
      currentPage.value  = res.page
    } catch (e: any) {
      error.value = e?.message
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    current,
    sessions,
    loading,
    loadingAction,
    error,
    totalCount,
    currentPage,
    // computed
    isOpen,
    // helpers
    formatCurrency,
    // actions
    loadCurrent,
    openSession,
    closeSession,
    addMovement,
    loadSessions,
  }
}
