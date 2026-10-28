/**
 * Pago directo al vendedor: el comprador paga a una cuenta PROPIA del
 * vendedor (pago móvil, transferencia o Zelle), reporta la referencia y el
 * vendedor confirma. WorkPlace no recibe el dinero, solo concilia.
 * Backend: ManualPaymentsController (/payments/...).
 */
import { ref } from 'vue'
import { useApi } from '../core/useApi'

export type DirectPaymentMethod = 'PAGO_MOVIL' | 'BANK_TRANSFER' | 'ZELLE'
export type DirectPaymentSourceType = 'SERVICE_REQUEST' | 'CATALOG_ORDER'
export type DirectPaymentReportStatus = 'SUBMITTED' | 'CONFIRMED' | 'REJECTED'

export interface PaymentBank {
  code: string
  name: string
}

export interface SellerPaymentAccount {
  id: string
  method: DirectPaymentMethod
  currency: 'VES' | 'USD'
  bankCode: string | null
  bankName: string | null
  holderName: string
  holderDocument: string
  phone: string | null
  accountNumber: string | null
  email: string | null
  isActive: boolean
}

export interface PayableSellerAccount extends SellerPaymentAccount {
  // Monto a pagar en la moneda de esta cuenta (null: sin tasa vigente).
  amount: number | null
  exchangeRate: number | null
}

export interface DirectPaymentReport {
  id: string
  paymentIntentId: string
  reference: string
  paidAt: string
  paidCurrency: string
  paidAmount: number
  exchangeRate: number | null
  status: DirectPaymentReportStatus
  rejectionReason: string | null
  destination: Partial<SellerPaymentAccount>
  createdAt: string
}

export interface DirectPaymentIntent {
  id: string
  sourceType: DirectPaymentSourceType
  sourceId: string
  currency: 'VES' | 'USD'
  amount: number
  status: string
}

export interface DirectPaymentSession {
  intent: DirectPaymentIntent
  description: string
  priceChanged: boolean
  accounts: PayableSellerAccount[]
  reports: DirectPaymentReport[]
}

export interface IncomingPaymentReport extends DirectPaymentReport {
  payerName: string | null
  paymentIntent: DirectPaymentIntent & { metadata?: { description?: string } | null }
}

export const DIRECT_PAYMENT_METHOD_LABELS: Record<DirectPaymentMethod, string> = {
  PAGO_MOVIL: 'Pago móvil',
  BANK_TRANSFER: 'Transferencia',
  ZELLE: 'Zelle',
}

export function formatPaymentAmount(amount: number | null | undefined, currency: string) {
  if (amount === null || amount === undefined) return '—'
  const formatted = Number(amount).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return currency === 'VES' ? `Bs. ${formatted}` : `$${formatted}`
}

const banks = ref<PaymentBank[]>([])

export function useDirectPayments() {
  const { get, post, patch, del } = useApi()

  async function loadBanks() {
    if (banks.value.length) return banks.value
    banks.value = await get<PaymentBank[]>('/payments/banks')
    return banks.value
  }

  // ─── Vendedor: cuentas de cobro ──────────────────────────────────────────
  const listMyAccounts = () => get<SellerPaymentAccount[]>('/payments/seller-accounts')
  const createAccount = (data: Partial<SellerPaymentAccount>) =>
    post<SellerPaymentAccount>('/payments/seller-accounts', data)
  const setAccountActive = (id: string, isActive: boolean) =>
    patch<SellerPaymentAccount>(`/payments/seller-accounts/${id}`, { isActive })
  const removeAccount = (id: string) =>
    del<{ deleted: boolean; deactivated: boolean }>(`/payments/seller-accounts/${id}`)

  // ─── Comprador ───────────────────────────────────────────────────────────
  const startPayment = (sourceType: DirectPaymentSourceType, sourceId: string) =>
    post<DirectPaymentSession>('/payments/manual/intents', { sourceType, sourceId })
  const reportPayment = (
    intentId: string,
    data: { sellerPaymentAccountId: string; reference: string; paidAt: string; payerBankCode?: string },
  ) => post<DirectPaymentReport>(`/payments/manual/intents/${intentId}/report`, data)

  // ─── Vendedor: confirmación ──────────────────────────────────────────────
  const listIncoming = (status?: DirectPaymentReportStatus) =>
    get<IncomingPaymentReport[]>(`/payments/manual/reports/incoming${status ? `?status=${status}` : ''}`)
  const confirmReport = (id: string) => post<DirectPaymentReport>(`/payments/manual/reports/${id}/confirm`, {})
  const rejectReport = (id: string, reason: string) =>
    post<DirectPaymentReport>(`/payments/manual/reports/${id}/reject`, { reason })

  return {
    banks,
    loadBanks,
    listMyAccounts,
    createAccount,
    setAccountActive,
    removeAccount,
    startPayment,
    reportPayment,
    listIncoming,
    confirmReport,
    rejectReport,
  }
}
