<template>
  <div class="card-premium p-6">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="text-lg font-bold text-gray-900">Mis retiros</h3>
        <p class="text-sm text-gray-500">El saldo se descuenta al solicitar y un admin lo transfiere a tu cuenta.</p>
      </div>
    </div>
    <p v-if="!withdrawals.length" class="text-sm text-gray-500">Todavía no solicitaste retiros.</p>
    <ul v-else class="divide-y divide-gray-100">
      <li v-for="w in withdrawals" :key="w.id" class="py-3 flex flex-wrap items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="font-semibold text-gray-900">{{ formatMoney(Number(w.amount), w.currency) }}</p>
          <p class="text-xs text-gray-500 break-words">{{ describeDestination(w.destination) }}</p>
          <p class="text-xs text-gray-400">{{ formatDateTime(w.createdAt) }}</p>
          <p v-if="w.status === 'PAID' && w.payoutReference" class="text-xs text-green-700">Referencia: {{ w.payoutReference }}</p>
          <p v-if="w.status === 'REJECTED' && w.rejectionReason" class="text-xs text-gray-600">Motivo: {{ w.rejectionReason }}</p>
        </div>
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold" :class="WITHDRAWAL_STATUS_CLASSES[w.status]">
          {{ WITHDRAWAL_STATUS_LABELS[w.status] }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import {
  WITHDRAWAL_STATUS_CLASSES,
  WITHDRAWAL_STATUS_LABELS,
  describeDestination,
  type WalletWithdrawal,
} from '~/composables/wallets/useWalletWithdrawals'

defineProps<{
  withdrawals: WalletWithdrawal[]
  formatMoney: (amount: number, currency?: string) => string
  formatDateTime: (date: string) => string
}>()
</script>
