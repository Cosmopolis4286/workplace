<template>
  <aside class="space-y-4">
    <!-- Details -->
    <div class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Detalles</h3>
      <div class="space-y-3 text-sm">
        <div class="flex justify-between gap-4"><span class="text-gray-500">Estado</span><span class="font-semibold text-gray-900">{{ wallet ? statusLabels[wallet.status] : '—' }}</span></div>
        <div class="flex justify-between gap-4"><span class="text-gray-500">Movimientos</span><span class="font-semibold text-gray-900">{{ wallet?._count?.transactions ?? 0 }}</span></div>
        <div class="flex justify-between gap-4"><span class="text-gray-500">Moneda</span><span class="font-semibold text-gray-900">{{ wallet?.currency ?? '—' }}</span></div>
        <div class="flex justify-between gap-4">
          <span class="text-gray-500">PIN</span>
          <span class="font-semibold" :class="wallet?.hasPin ? 'text-green-600' : 'text-yellow-600'">
            {{ wallet?.hasPin ? 'Configurado' : 'Sin configurar' }}
          </span>
        </div>
        <div v-if="wallet?.frozenAt" class="flex justify-between gap-4"><span class="text-gray-500">Congelada</span><span class="font-semibold text-red-600">Sí</span></div>
        <div class="flex flex-col gap-1"><span class="text-gray-500">ID</span><span class="font-mono text-xs text-gray-400 break-all">{{ wallet?.id ?? '—' }}</span></div>
      </div>
    </div>

    <!-- Limits -->
    <div v-if="limitsStatus && wallet" class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Límites de hoy</h3>
      <div class="space-y-3">
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-500">Débito diario</span>
            <span class="font-medium text-gray-700">{{ formatMoney(limitsStatus.used.dailyDebit) }} / {{ formatMoney(limitsStatus.limits.dailyDebit) }}</span>
          </div>
          <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" :class="limitBarClass(limitsStatus.used.dailyDebit, limitsStatus.limits.dailyDebit)" :style="{ width: limitPct(limitsStatus.used.dailyDebit, limitsStatus.limits.dailyDebit) }" />
          </div>
        </div>
        <div>
          <div class="flex justify-between text-xs mb-1">
            <span class="text-gray-500">Transferencias hoy</span>
            <span class="font-medium text-gray-700">{{ limitsStatus.used.dailyTransfers }} / {{ limitsStatus.limits.dailyTransfers }}</span>
          </div>
          <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full rounded-full transition-all" :class="limitBarClass(limitsStatus.used.dailyTransfers, limitsStatus.limits.dailyTransfers)" :style="{ width: limitPct(limitsStatus.used.dailyTransfers, limitsStatus.limits.dailyTransfers) }" />
          </div>
        </div>
        <p class="text-xs text-gray-400">Máx. por operación: {{ formatMoney(limitsStatus.limits.maxSingleTx) }}</p>
      </div>
    </div>

    <!-- Quick stats -->
    <div v-if="creditTotal !== null" class="card p-5">
      <h3 class="text-sm font-semibold text-gray-700 mb-3">Esta página</h3>
      <div class="space-y-3 text-sm">
        <div class="flex justify-between gap-4">
          <span class="text-gray-500 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-green-500 inline-block" />Créditos</span>
          <span class="font-semibold text-green-700 tabular-nums">{{ formatMoney(creditTotal, wallet?.currency) }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-gray-500 flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-red-500 inline-block" />Débitos</span>
          <span class="font-semibold text-red-700 tabular-nums">{{ formatMoney(debitTotal, wallet?.currency) }}</span>
        </div>
      </div>
    </div>

    <!-- PIN warning -->
    <div v-if="wallet && !wallet.hasPin && wallet.status === 'ACTIVE'" class="card p-5 border border-yellow-200 bg-yellow-50">
      <div class="flex items-start gap-3">
        <ExclamationTriangleIcon class="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p class="text-sm font-semibold text-yellow-800 mb-1">PIN requerido</p>
          <p class="text-xs text-yellow-700 mb-3">Las operaciones de retiro, transferencia y pago requieren PIN de seguridad.</p>
          <button class="text-xs font-semibold text-yellow-800 underline" @click="$emit('open-pin-modal')">Configurar PIN ahora</button>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import type { Wallet, WalletStatus, WalletLimitsStatus } from '~/composables/wallets/useWallets'

defineProps<{
  wallet: Wallet | null
  limitsStatus: WalletLimitsStatus | null
  statusLabels: Record<WalletStatus, string>
  creditTotal: number | null
  debitTotal: number
  formatMoney: (amount: number, currency?: string) => string
}>()

defineEmits<{
  'open-pin-modal': []
}>()

function limitPct(used: number, max: number) {
  return max > 0 ? `${Math.min(100, (used / max) * 100)}%` : '0%'
}
function limitBarClass(used: number, max: number) {
  const pct = max > 0 ? (used / max) * 100 : 0
  if (pct >= 90) return 'bg-red-500'
  if (pct >= 70) return 'bg-yellow-400'
  return 'bg-green-500'
}
</script>
