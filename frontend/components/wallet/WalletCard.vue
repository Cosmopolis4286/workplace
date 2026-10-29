<template>
  <div>
    <div v-if="loading && !wallet" class="card p-6 animate-pulse space-y-4">
      <div class="skeleton h-4 w-28 rounded" /><div class="skeleton h-12 w-56 rounded" />
    </div>

    <!-- Frozen alert -->
    <div v-if="wallet?.frozenAt" class="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
      <LockClosedIcon class="h-5 w-5 text-yellow-600 flex-shrink-0" />
      <div class="flex-1">
        <p class="text-sm font-semibold text-yellow-800">Billetera congelada</p>
        <p class="text-xs text-yellow-700">Un administrador ha congelado esta billetera. Contacta soporte.</p>
      </div>
    </div>

    <!-- Wallet card -->
    <div v-if="wallet" class="card overflow-hidden">
      <div
        class="p-6 text-white relative overflow-hidden"
        :class="wallet.frozenAt
          ? 'bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900'
          : 'bg-gradient-to-br from-gray-900 via-gray-800 to-red-900'"
      >
        <div class="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full" />
        <div class="absolute -right-4 top-12 w-24 h-24 bg-white/5 rounded-full" />

        <div class="relative flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-widest text-white/60 font-bold">Saldo disponible</p>
            <p class="text-4xl font-black mt-2 tabular-nums">
              {{ formatMoney(wallet.balance, wallet.currency) }}
            </p>
          </div>
          <div class="flex flex-col items-end gap-2">
            <span
              class="px-3 py-1 rounded-full text-xs font-bold"
              :class="statusClasses[wallet.status]"
            >{{ statusLabels[wallet.status] }}</span>
            <span
              class="px-3 py-1 rounded-full text-xs font-bold"
              :class="wallet.hasPin ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'"
            >
              <LockClosedIcon v-if="wallet.hasPin" class="h-3 w-3 inline mr-1" />
              <LockOpenIcon v-else class="h-3 w-3 inline mr-1" />
              PIN {{ wallet.hasPin ? 'configurado' : 'no configurado' }}
            </span>
          </div>
        </div>

        <div class="relative mt-8 grid grid-cols-3 gap-4 text-sm">
          <div><p class="text-white/50 text-xs">Moneda</p><p class="font-semibold">{{ wallet.currency }}</p></div>
          <div><p class="text-white/50 text-xs">Movimientos</p><p class="font-semibold">{{ wallet._count?.transactions ?? 0 }}</p></div>
          <div><p class="text-white/50 text-xs">Creada</p><p class="font-semibold">{{ formatDate(wallet.createdAt) }}</p></div>
        </div>

        <div v-if="wallet.status === 'ACTIVE'" class="relative mt-6 flex gap-3 flex-wrap">
          <button class="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors" @click="$emit('withdraw')">
            <ArrowUpTrayIcon class="h-4 w-4" />Retirar a mi banco
          </button>
          <button class="flex items-center gap-1.5 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors" @click="$emit('open-modal', 'pin')">
            <LockClosedIcon class="h-4 w-4" />
            {{ wallet.hasPin ? 'Cambiar PIN' : 'Configurar PIN' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading" class="card p-10 text-center border-2 border-dashed border-gray-200">
      <div class="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <WalletIcon class="h-7 w-7 text-workplace-red" />
      </div>
      <h3 class="text-base font-semibold text-gray-900 mb-1">Todavía no tienes billetera</h3>
      <p class="text-sm text-gray-500 mb-5">Aquí recibes devoluciones y cobros de Pago Protegido, y los retiras a tu banco.</p>
      <button class="btn-primary inline-flex items-center gap-2" @click="$emit('create')">
        <PlusIcon class="h-5 w-5" />Crear mi billetera
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ArrowUpTrayIcon,
  LockClosedIcon,
  LockOpenIcon,
  PlusIcon,
  WalletIcon,
} from '@heroicons/vue/24/outline'
import type { Wallet, WalletStatus } from '~/composables/wallets/useWallets'

defineProps<{
  wallet: Wallet | null
  loading: boolean
  formatMoney: (amount: number, currency?: string) => string
  formatDate: (date: string) => string
  statusLabels: Record<WalletStatus, string>
  statusClasses: Record<WalletStatus, string>
}>()

defineEmits<{
  'open-modal': [type: 'pin']
  withdraw: []
  create: []
}>()
</script>
