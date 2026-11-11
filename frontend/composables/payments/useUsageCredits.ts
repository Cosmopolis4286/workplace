import { useApi } from '~/composables/core/useApi'
import type { PayableSellerAccount } from '~/composables/payments/useDirectPayments'

export type UsageCreditPurchaseStatus = 'SUBMITTED' | 'CONFIRMED' | 'REJECTED'

export interface UsageCreditPackage {
  code: string
  units: number
  priceUsd: number
  accounts: PayableSellerAccount[]
}

export interface UsageCreditLot {
  id: string
  kind: 'PURCHASED' | 'PROMOTIONAL'
  units: string
  remaining: string
  expiresAt: string | null
  createdAt: string
}

export interface UsageCreditMovement {
  id: string
  type: 'GRANT' | 'CONSUME' | 'EXPIRE' | 'REVERSAL'
  concept: 'PURCHASE' | 'PROMOTION' | 'LEAD_FEE' | 'SUCCESS_FEE' | 'EXPIRATION' | 'REVERSAL' | 'ADJUSTMENT'
  units: string
  createdAt: string
}

export interface UsageCreditPurchase {
  id: string
  packageCode: string
  units: string
  priceUsd: string
  reference: string
  paidAmount: string
  paidCurrency: string
  status: UsageCreditPurchaseStatus
  rejectionReason: string | null
  createdAt: string
  user?: { id: string; email: string; firstName: string; lastName: string }
}

export interface UsageCreditsSummary {
  balance: { purchased: string; promotional: string; total: string; lots: UsageCreditLot[] }
  movements: UsageCreditMovement[]
  purchases: UsageCreditPurchase[]
}

export const CREDIT_CONCEPT_LABELS: Record<UsageCreditMovement['concept'], string> = {
  PURCHASE: 'Compra de créditos',
  PROMOTION: 'Créditos de regalo',
  LEAD_FEE: 'Cargo por oportunidad aceptada',
  SUCCESS_FEE: 'Comisión por servicio completado',
  EXPIRATION: 'Vencimiento de créditos de regalo',
  REVERSAL: 'Devolución de un cargo',
  ADJUSTMENT: 'Ajuste',
}

export const CREDIT_PURCHASE_STATUS_LABELS: Record<UsageCreditPurchaseStatus, string> = {
  SUBMITTED: 'En revisión',
  CONFIRMED: 'Acreditada',
  REJECTED: 'Rechazada',
}

export function useUsageCredits() {
  const { get, post } = useApi()
  return {
    getMine: () => get<UsageCreditsSummary>('/usage-credits/me'),
    getPackages: () => get<UsageCreditPackage[]>('/usage-credits/packages'),
    reportPurchase: (dto: {
      packageCode: string
      platformAccountId: string
      reference: string
      paidAt: string
      payerBankCode?: string
    }) => post<UsageCreditPurchase>('/usage-credits/purchases', dto),
    listPurchases: (status?: UsageCreditPurchaseStatus) =>
      get<UsageCreditPurchase[]>(`/usage-credits/admin/purchases${status ? `?status=${status}` : ''}`),
    confirmPurchase: (id: string) => post(`/usage-credits/admin/purchases/${id}/confirm`, {}),
    rejectPurchase: (id: string, reason: string) =>
      post(`/usage-credits/admin/purchases/${id}/reject`, { reason }),
  }
}
