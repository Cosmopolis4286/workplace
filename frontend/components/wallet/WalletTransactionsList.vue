<template>
  <div class="card overflow-hidden">
    <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
      <div>
        <h2 class="text-base font-bold text-gray-900">Movimientos</h2>
        <p class="text-xs text-gray-400">{{ meta.total }} transacciones</p>
      </div>
      <div class="flex gap-1 bg-gray-100 rounded-lg p-1 text-xs">
        <button
          v-for="f in filters" :key="f.value ?? 'all'"
          class="px-3 py-1.5 rounded-md font-medium transition-colors"
          :class="activeFilter === f.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'"
          @click="$emit('filter', f.value)"
        >{{ f.label }}</button>
      </div>
    </div>

    <div v-if="loading" class="p-6 space-y-3">
      <div v-for="i in 4" :key="i" class="animate-pulse flex gap-3 items-center">
        <div class="skeleton w-10 h-10 rounded-xl flex-shrink-0" />
        <div class="flex-1 space-y-2"><div class="skeleton h-3 w-40 rounded" /><div class="skeleton h-3 w-24 rounded" /></div>
        <div class="skeleton h-4 w-20 rounded" />
      </div>
    </div>

    <div v-else-if="transactions.length === 0" class="p-10 text-center">
      <ArrowsRightLeftIcon class="h-10 w-10 text-gray-300 mx-auto mb-3" />
      <p class="text-sm font-medium text-gray-600">Sin movimientos</p>
    </div>

    <div v-else class="divide-y divide-gray-100">
      <div v-for="tx in transactions" :key="tx.id" class="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" :class="typeClasses[tx.type]">
          <ArrowDownIcon v-if="tx.type === 'CREDIT'" class="h-5 w-5" />
          <ArrowUpIcon v-else-if="tx.type === 'DEBIT'" class="h-5 w-5" />
          <AdjustmentsHorizontalIcon v-else class="h-5 w-5" />
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-semibold text-gray-900 truncate">{{ tx.description || typeLabels[tx.type] }}</p>
          <div class="flex items-center gap-2 mt-0.5">
            <p class="text-xs text-gray-400">{{ formatDateTime(tx.createdAt) }}</p>
            <span v-if="tx.reference" class="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded truncate max-w-[120px]" :title="tx.reference">
              {{ tx.reference }}
            </span>
          </div>
        </div>
        <div class="text-right flex-shrink-0">
          <p class="text-sm font-bold tabular-nums" :class="tx.type === 'DEBIT' ? 'text-red-600' : tx.type === 'CREDIT' ? 'text-green-600' : 'text-gray-700'">
            {{ tx.type === 'DEBIT' ? '-' : '+' }}{{ formatMoney(tx.amount, currency) }}
          </p>
          <p class="text-xs text-gray-400 tabular-nums">{{ formatMoney(tx.balanceAfter, currency) }}</p>
        </div>
      </div>
    </div>

    <div v-if="meta.totalPages > 1" class="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
      <span class="text-gray-500 text-xs">Página {{ meta.page }} de {{ meta.totalPages }}</span>
      <div class="flex gap-2">
        <button class="btn-secondary text-xs px-3 py-1.5" :disabled="meta.page <= 1" @click="$emit('page', meta.page - 1)">Anterior</button>
        <button class="btn-secondary text-xs px-3 py-1.5" :disabled="meta.page >= meta.totalPages" @click="$emit('page', meta.page + 1)">Siguiente</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AdjustmentsHorizontalIcon, ArrowDownIcon, ArrowUpIcon, ArrowsRightLeftIcon } from '@heroicons/vue/24/outline'
import type { WalletTransaction, WalletTransactionType } from '~/composables/wallets/useWallets'

defineProps<{
  transactions: WalletTransaction[]
  meta: { total: number; page: number; totalPages: number }
  loading: boolean
  filters: { label: string; value: WalletTransactionType | undefined }[]
  activeFilter: WalletTransactionType | undefined
  currency: string | undefined
  typeLabels: Record<WalletTransactionType, string>
  typeClasses: Record<WalletTransactionType, string>
  formatMoney: (amount: number, currency?: string) => string
  formatDateTime: (date: string) => string
}>()

defineEmits<{
  filter: [value: WalletTransactionType | undefined]
  page: [page: number]
}>()
</script>
