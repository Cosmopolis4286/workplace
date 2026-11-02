/**
 * Pago Protegido por operación: el cliente paga la garantía de una solicitud
 * a una cuenta de la plataforma y reporta la referencia; al confirmarlo un
 * admin, la plataforma la retiene hasta que el servicio se complete.
 * Backend: EscrowFundingController (/escrow-funding/...).
 */
import { useApi } from '../core/useApi'
import type { DirectPaymentReportStatus, PayableSellerAccount } from './useDirectPayments'

export interface EscrowFundingReport {
  id: string
  sourceType: string
  sourceId: string
  amount: number
  reference: string
  paidAt: string
  paidCurrency: string
  paidAmount: number
  status: DirectPaymentReportStatus
  rejectionReason: string | null
  createdAt: string
}

export interface EscrowFundingOptions {
  currency: string
  required: number
  walletBalance: number
  amountDue: number
  held: boolean
  serviceName?: string
  providerName?: string
  pendingReport: EscrowFundingReport | null
  lastRejected?: EscrowFundingReport | null
  accounts: PayableSellerAccount[]
}

export interface AdminEscrowFundingReport extends EscrowFundingReport {
  payerName: string
  payerEmail: string
  source: { id: string; serviceName: string; providerName: string; escrowStatus: string } | null
}

export function useEscrowFunding() {
  const { get, post } = useApi()

  const getServiceRequestOptions = (requestId: string) =>
    get<EscrowFundingOptions>(`/escrow-funding/service-requests/${requestId}`)
  const reportServiceRequestPayment = (
    requestId: string,
    data: { platformAccountId: string; reference: string; paidAt: string; payerBankCode?: string },
  ) => post<EscrowFundingReport>(`/escrow-funding/service-requests/${requestId}/reports`, data)

  // ─── Admin ───────────────────────────────────────────────────────────────
  const listReports = (status?: DirectPaymentReportStatus) =>
    get<AdminEscrowFundingReport[]>(`/escrow-funding/admin/reports${status ? `?status=${status}` : ''}`)
  const confirmReport = (id: string) =>
    post<{ confirmed: boolean; held: boolean }>(`/escrow-funding/admin/reports/${id}/confirm`, {})
  const rejectReport = (id: string, reason: string) =>
    post<{ rejected: boolean }>(`/escrow-funding/admin/reports/${id}/reject`, { reason })

  return { getServiceRequestOptions, reportServiceRequestPayment, listReports, confirmReport, rejectReport }
}
