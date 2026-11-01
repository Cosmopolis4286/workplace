import { useApi } from '~/composables/core/useApi'

export type WithdrawalStatus = 'PENDING' | 'PAID' | 'REJECTED'

export interface WithdrawalDestination {
  method: 'PAGO_MOVIL' | 'BANK_TRANSFER' | 'ZELLE'
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
  amount: number | string
  currency: string
  destination: WithdrawalDestination
  status: WithdrawalStatus
  payoutReference: string | null
  rejectionReason: string | null
  reviewedAt: string | null
  createdAt: string
  user?: { id: string; email: string; firstName: string; lastName: string }
}

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  PENDING: 'En proceso',
  PAID: 'Pagado',
  REJECTED: 'Rechazado (reintegrado)',
}

export const WITHDRAWAL_STATUS_CLASSES: Record<WithdrawalStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-100 text-gray-700',
}

export function describeDestination(d: WithdrawalDestination) {
  if (d.method === 'ZELLE') return `Zelle · ${d.email ?? ''} · ${d.holderName}`
  if (d.method === 'PAGO_MOVIL') return `Pago móvil · ${d.bankName ?? d.bankCode ?? ''} · ${d.phone ?? ''} · ${d.holderDocument}`
  return `Transferencia · ${d.bankName ?? d.bankCode ?? ''} · ${d.accountNumber ?? ''} · ${d.holderDocument}`
}

export function useWalletWithdrawals() {
  const { get, patch } = useApi()

  const listMine = () => get<WalletWithdrawal[]>('/wallet-withdrawals/mine')

  const listAll = (status?: WithdrawalStatus, page = 1, limit = 20) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) params.set('status', status)
    return get<{ data: WalletWithdrawal[]; total: number; page: number; limit: number }>(`/wallet-withdrawals?${params}`)
  }

  const markPaid = (id: string, payoutReference: string) =>
    patch<WalletWithdrawal>(`/wallet-withdrawals/${id}/paid`, { payoutReference })

  const reject = (id: string, reason: string) =>
    patch<WalletWithdrawal>(`/wallet-withdrawals/${id}/reject`, { reason })

  return { listMine, listAll, markPaid, reject }
}
