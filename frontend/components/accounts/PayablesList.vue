<template>
  <div class="space-y-4">
    <div class="card divide-y divide-gray-100">
      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-4">
          <div class="skeleton h-4 w-48 rounded flex-1" />
          <div class="skeleton h-6 w-20 rounded" />
        </div>
      </template>

      <div v-else-if="payables.length === 0" class="p-12 text-center">
        <BanknotesIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No hay cuentas por pagar registradas</p>
        <button class="btn-primary mt-4 text-sm" @click="$emit('create')">Registrar deuda</button>
      </div>

      <template v-else>
        <div v-for="payable in payables" :key="payable.id" class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">{{ payable.description }}</p>
            <p class="text-sm text-gray-500">
              {{ payable.supplier?.name ?? 'Sin proveedor asociado' }}
              <span v-if="payable.dueDate"> · vence {{ formatDate(payable.dueDate) }}</span>
            </p>
          </div>

          <span class="badge" :class="statusClasses[payable.status]">{{ statusLabels[payable.status] }}</span>

          <div class="text-right flex-shrink-0">
            <p class="font-semibold text-gray-900">
              {{ payable.amount.toLocaleString('es-VE', { maximumFractionDigits: 2 }) }} {{ payable.currencyCode }}
            </p>
            <p class="text-xs text-gray-400">≈ ${{ payable.amountUsd.toFixed(2) }} USD</p>
          </div>

          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              v-if="payable.status === 'PENDING'"
              class="p-1.5 rounded hover:bg-green-50 text-green-600"
              title="Marcar como pagado"
              @click="$emit('mark-paid', payable)"
            >
              <CheckIcon class="h-4 w-4" />
            </button>
            <button class="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar" @click="$emit('delete', payable)">
              <TrashIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BanknotesIcon, CheckIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { Payable, AccountStatus } from '~/composables/commerce/useAccounts'
import { useDateFormat } from '~/composables/core/useDateFormat'

defineProps<{ payables: Payable[]; loading: boolean }>()
defineEmits<{ create: []; delete: [payable: Payable]; 'mark-paid': [payable: Payable] }>()

const { formatDate } = useDateFormat()

const statusLabels: Record<AccountStatus, string> = {
  PENDING: 'Pendiente', PAID: 'Pagado', OVERDUE: 'Vencido', CANCELLED: 'Cancelado',
}
const statusClasses: Record<AccountStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800', CANCELLED: 'bg-gray-100 text-gray-600',
}
</script>

<style scoped>
.badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
.skeleton { @apply bg-gray-200 animate-pulse; }
</style>
