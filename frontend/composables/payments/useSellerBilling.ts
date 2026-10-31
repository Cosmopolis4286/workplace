/**
 * Estado de cuenta del vendedor: las comisiones de la plataforma se acumulan
 * por venta y se pagan una vez por semana a una cuenta de la plataforma.
 * Backend: SellerBillingController (/billing/...).
 */
import { useApi } from '../core/useApi'
import type {
  PayableSellerAccount,
  SellerPaymentAccount,
  DirectPaymentReportStatus,
} from './useDirectPayments'

export type SellerStatementStatus = 'ISSUED' | 'PAYMENT_REPORTED' | 'PAID' | 'OVERDUE' | 'SUSPENDED'
export type SellerChargeType = 'ORDER' | 'SERVICE_REQUEST' | 'RIDE' | 'GROUP_BUYING' | 'CATALOG_ORDER'

export interface SellerCommissionCharge {
  id: string
  type: SellerChargeType
  reference: string
  amount: number
  currency: string
  status: 'PENDING' | 'STATEMENTED' | 'COLLECTED'
  createdAt: string
}

export interface SellerStatementPayment {
  id: string
  statementId: string
  reference: string
  paidAt: string
  paidCurrency: string
  paidAmount: number
  status: DirectPaymentReportStatus
  rejectionReason: string | null
  createdAt: string
}

export interface SellerStatement {
  id: string
  sellerUserId: string
  periodStart: string
  periodEnd: string
  currency: string
  totalAmount: number
  status: SellerStatementStatus
  issuedAt: string
  dueAt: string
  overdueAt: string | null
  suspendedAt: string | null
  paidAt: string | null
  charges?: SellerCommissionCharge[]
  payments?: SellerStatementPayment[]
}

export interface SellerBillingSummary {
  currentPeriod: { start: string; accrued: number; charges: SellerCommissionCharge[] }
  statements: SellerStatement[]
  blocked: boolean
  dueDays: number
  graceHours: number
}

export interface AdminStatementPayment extends SellerStatementPayment {
  sellerUserId: string
  sellerName: string | null
  sellerEmail: string | null
  statement: Pick<SellerStatement, 'id' | 'totalAmount' | 'currency' | 'periodStart' | 'periodEnd' | 'status' | 'dueAt'>
}

export interface AdminStatement extends SellerStatement {
  sellerName: string | null
  sellerEmail: string | null
}

export const STATEMENT_STATUS_LABELS: Record<SellerStatementStatus, string> = {
  ISSUED: 'Por pagar',
  PAYMENT_REPORTED: 'Pago en revisión',
  PAID: 'Pagado',
  OVERDUE: 'Vencido',
  SUSPENDED: 'Suspendido',
}

export const STATEMENT_STATUS_CLASSES: Record<SellerStatementStatus, string> = {
  ISSUED: 'bg-amber-100 text-amber-800',
  PAYMENT_REPORTED: 'bg-blue-100 text-blue-700',
  PAID: 'bg-green-100 text-green-700',
  OVERDUE: 'bg-red-100 text-red-700',
  SUSPENDED: 'bg-red-600 text-white',
}

export const CHARGE_TYPE_LABELS: Record<SellerChargeType, string> = {
  ORDER: 'Pedido',
  SERVICE_REQUEST: 'Servicio',
  RIDE: 'Viaje',
  GROUP_BUYING: 'Compra agrupada',
  CATALOG_ORDER: 'Pedido del catálogo',
}

export function useSellerBilling() {
  const { get, post, patch, del } = useApi()

  // ─── Vendedor ────────────────────────────────────────────────────────────
  const getMySummary = () => get<SellerBillingSummary>('/billing/me')
  const getPaymentOptions = (statementId: string) =>
    get<{ statement: SellerStatement; accounts: PayableSellerAccount[] }>(
      `/billing/statements/${statementId}/payment-options`,
    )
  const reportPayment = (
    statementId: string,
    data: { platformAccountId: string; reference: string; paidAt: string; payerBankCode?: string },
  ) => post<SellerStatementPayment>(`/billing/statements/${statementId}/payments`, data)

  // ─── Admin ───────────────────────────────────────────────────────────────
  const listStatements = (status?: SellerStatementStatus) =>
    get<AdminStatement[]>(`/billing/admin/statements${status ? `?status=${status}` : ''}`)
  const listPayments = (status?: DirectPaymentReportStatus) =>
    get<AdminStatementPayment[]>(`/billing/admin/payments${status ? `?status=${status}` : ''}`)
  const confirmPayment = (id: string) => post<SellerStatement>(`/billing/admin/payments/${id}/confirm`, {})
  const rejectPayment = (id: string, reason: string) =>
    post<{ rejected: boolean }>(`/billing/admin/payments/${id}/reject`, { reason })

  // Cuentas donde la plataforma cobra (misma forma que las del vendedor).
  const listCollectionAccounts = () => get<SellerPaymentAccount[]>('/billing/admin/collection-accounts')
  const createCollectionAccount = (data: Partial<SellerPaymentAccount>) =>
    post<SellerPaymentAccount>('/billing/admin/collection-accounts', data)
  const setCollectionAccountActive = (id: string, isActive: boolean) =>
    patch<SellerPaymentAccount>(`/billing/admin/collection-accounts/${id}`, { isActive })
  const removeCollectionAccount = (id: string) =>
    del<{ deleted: boolean; deactivated: boolean }>(`/billing/admin/collection-accounts/${id}`)

  return {
    getMySummary,
    getPaymentOptions,
    reportPayment,
    listStatements,
    listPayments,
    confirmPayment,
    rejectPayment,
    listCollectionAccounts,
    createCollectionAccount,
    setCollectionAccountActive,
    removeCollectionAccount,
  }
}
