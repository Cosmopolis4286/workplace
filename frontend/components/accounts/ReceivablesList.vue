<template>
  <div class="space-y-4">
    <div class="card divide-y divide-gray-100">
      <template v-if="loading">
        <div v-for="i in 3" :key="i" class="p-4 flex items-center gap-4">
          <div class="skeleton h-4 w-48 rounded flex-1" />
          <div class="skeleton h-6 w-20 rounded" />
        </div>
      </template>

      <div v-else-if="receivables.length === 0" class="p-12 text-center">
        <BanknotesIcon class="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p class="text-gray-500">No hay cuentas por cobrar registradas</p>
        <button class="btn-primary mt-4 text-sm" @click="$emit('create')">Registrar fiado</button>
      </div>

      <template v-else>
        <div v-for="receivable in receivables" :key="receivable.id">
          <div class="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
            <div class="flex-1 min-w-0">
              <p class="font-medium text-gray-900 truncate">{{ receivable.description }}</p>
              <p class="text-sm text-gray-500">
                {{ receivable.customer?.name ?? 'Sin cliente asociado' }}
                <span v-if="receivable.dueDate"> · vence {{ formatDate(receivable.dueDate) }}</span>
              </p>
            </div>

            <span class="badge" :class="statusClasses[receivable.status]">{{ statusLabels[receivable.status] }}</span>

            <div class="text-right flex-shrink-0">
              <p class="font-semibold text-gray-900">
                {{ receivable.amount.toLocaleString('es-VE', { maximumFractionDigits: 2 }) }} {{ receivable.currencyCode }}
              </p>
              <p class="text-xs text-gray-400">≈ ${{ receivable.amountUsd.toFixed(2) }} USD</p>
            </div>

            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                v-if="receivable.currencyCode !== 'USD' && receivable.status === 'PENDING'"
                class="p-1.5 rounded hover:bg-amber-50 text-amber-600"
                title="Ver riesgo de reposición"
                @click="toggleRisk(receivable.id)"
              >
                <ExclamationTriangleIcon class="h-4 w-4" />
              </button>
              <button
                v-if="receivable.status === 'PENDING'"
                class="p-1.5 rounded hover:bg-green-50 text-green-600"
                title="Marcar como cobrado"
                @click="$emit('mark-paid', receivable)"
              >
                <CheckIcon class="h-4 w-4" />
              </button>
              <button class="p-1.5 rounded hover:bg-red-50 text-red-500" title="Eliminar" @click="$emit('delete', receivable)">
                <TrashIcon class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div v-if="expandedId === receivable.id" class="px-4 pb-4 -mt-2">
            <div v-if="riskLoading" class="text-xs text-gray-400">Calculando riesgo…</div>
            <div v-else-if="risk && !risk.hasExposure" class="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
              {{ risk.message ?? 'Sin exposición cambiaria.' }}
            </div>
            <div v-else-if="risk" class="text-xs p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
              <p>
                La tasa de {{ receivable.currencyCode }} pasó de {{ risk.originalRate }} a {{ risk.currentRate }}
                ({{ risk.rateChangePct! > 0 ? '+' : '' }}{{ risk.rateChangePct }}%) desde que se generó esta cuenta.
              </p>
              <p v-if="risk.valueLossUsd! > 0" class="font-medium">
                ⚠️ Si cobrás hoy, esos {{ receivable.amount }} {{ receivable.currencyCode }} equivalen a
                ${{ risk.currentAmountUsd }} USD en vez de los ${{ risk.originalAmountUsd }} originales —
                perdiste ${{ risk.valueLossUsd }} de poder de reposición por el retraso en el cobro.
              </p>
              <p v-else class="text-gray-500">
                La moneda no perdió valor frente al USD desde la venta — sin pérdida de poder de reposición todavía.
              </p>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { BanknotesIcon, CheckIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
import { useAccounts, type Receivable, type AccountStatus, type ReplacementRisk } from '~/composables/commerce/useAccounts'
import { useDateFormat } from '~/composables/core/useDateFormat'

defineProps<{ receivables: Receivable[]; loading: boolean }>()
defineEmits<{ create: []; delete: [receivable: Receivable]; 'mark-paid': [receivable: Receivable] }>()

const { formatDate } = useDateFormat()
const { getReplacementRisk } = useAccounts()

const statusLabels: Record<AccountStatus, string> = {
  PENDING: 'Pendiente', PAID: 'Cobrado', OVERDUE: 'Vencido', CANCELLED: 'Cancelado',
}
const statusClasses: Record<AccountStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', PAID: 'bg-green-100 text-green-800',
  OVERDUE: 'bg-red-100 text-red-800', CANCELLED: 'bg-gray-100 text-gray-600',
}

const expandedId = ref<string | null>(null)
const riskLoading = ref(false)
const risk = ref<ReplacementRisk | null>(null)

async function toggleRisk(id: string) {
  if (expandedId.value === id) {
    expandedId.value = null
    return
  }
  expandedId.value = id
  risk.value = null
  riskLoading.value = true
  risk.value = await getReplacementRisk(id)
  riskLoading.value = false
}
</script>

<style scoped>
.badge { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium; }
.skeleton { @apply bg-gray-200 animate-pulse; }
</style>
