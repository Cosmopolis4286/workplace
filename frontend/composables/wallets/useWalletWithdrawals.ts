/**
 * Retiros reales del saldo de la billetera a una cuenta bancaria. El saldo se
 * reserva al pedirlo; un admin transfiere y registra la referencia.
 * Backend: WalletWithdrawalsController (/wallet-withdrawals/...).
 */
import { useApi } from '../core/useApi'
import type { DirectPaymentMethod, SellerPaymentAccount } from '../payments/useDirectPayments'

export type WithdrawalStatus = 'PENDING' | 'PAID' | 'REJECTED'

export interface WithdrawalDestination {
  method: DirectPaymentMethod
  currency: string
  bankCode: string | null
  bankName: string | null
  holderName: string
  holderDocument: string
  phone: string | null
  accountNumber: string | null
  email: string | null
}

export interface WalletWithdrawal {
  id: string
  userId: string
  amount: number
  currency: string
  destination: WithdrawalDestination
  payoutCurrency: string
  payoutAmount: number
  exchangeRate: number | null
  status: WithdrawalStatus
  payoutReference: string | null
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string
}

export interface AdminWalletWithdrawal extends WalletWithdrawal {
  userName: string
  userEmail: string
}

export interface CreateWithdrawalPayload {
  amount: number
  pin: string
  accountId?: string
  destination?: Partial<SellerPaymentAccount>
}

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  PENDING: 'En proceso',
  PAID: 'Pagado',
  REJECTED: 'Rechazado',
}

export const WITHDRAWAL_STATUS_CLASSES: Record<WithdrawalStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export function useWalletWithdrawals() {
  const { get, post } = useApi()

  const listMine = () => get<WalletWithdrawal[]>('/wallet-withdrawals/mine')
  const create = (payload: CreateWithdrawalPayload) => post<WalletWithdrawal>('/wallet-withdrawals', payload)

  // ─── Admin ───────────────────────────────────────────────────────────────
  const listAll = (status?: WithdrawalStatus) =>
    get<AdminWalletWithdrawal[]>(`/wallet-withdrawals/admin${status ? `?status=${status}` : ''}`)
  const markPaid = (id: string, payoutReference: string) =>
    post<{ paid: boolean }>(`/wallet-withdrawals/admin/${id}/paid`, { payoutReference })
  const reject = (id: string, reason: string) =>
    post<{ rejected: boolean }>(`/wallet-withdrawals/admin/${id}/reject`, { reason })

  return { listMine, create, listAll, markPaid, reject }
}
